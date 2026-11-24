import type { IDBPObjectStore } from 'idb';
import { openItemsDb, type ItemsDb, type ItemsDbSchema, type StoredChange } from './db';
import type { ItemsChangedEvent } from './events';
import { orderBetween, ulid } from './ids';
import {
  CLEARABLE_FIELDS,
  type Board,
  type BoardDraft,
  type Item,
  type ItemChange,
  type ItemChangeOp,
  type ItemDraft,
  type ItemPatch,
  type ItemQuery,
  type ItemSource,
} from './types';
import {
  parseBoardDraft,
  parseItemDraft,
  parseItemPatch,
  parseStoredBoard,
  parseStoredItem,
} from './validation';

/**
 * Доступ к Item и доскам. Каждая запись меняется в одной транзакции с журналом `changes`,
 * поэтому журнал не расходится с данными — на нём строятся отмена, аудит и синхронизация.
 * Вход проверяется здесь же: репозиторий — граница хранилища, кто бы его ни вызвал.
 */

export class ItemNotFoundError extends Error {
  constructor(public readonly itemId: string) {
    super(`Запись ${itemId} не найдена`);
    this.name = 'ItemNotFoundError';
  }
}

/** Запись изменилась с момента чтения: вызывающий передал устаревшую версию */
export class ItemConflictError extends Error {
  constructor(public readonly current: Item) {
    super(`Запись ${current.id} уже изменена (версия ${current.version})`);
    this.name = 'ItemConflictError';
  }
}

export const DEFAULT_STATUS = 'inbox';
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
/** Сколько записей журнала хранить; старые удаляются пачками */
export const CHANGES_RETENTION = 5_000;
const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];
type ItemWriteStore = IDBPObjectStore<ItemsDbSchema, ['items', 'changes'], 'items', 'readwrite'>;
type ChangeWriteStore = IDBPObjectStore<
  ItemsDbSchema,
  ['items', 'changes'],
  'changes',
  'readwrite'
>;

export interface ItemRepositoryOptions {
  dbName?: string;
  now?: () => Date;
  notify?: (event: ItemsChangedEvent) => void;
}

export interface ItemMoveTarget {
  status?: string;
  boardId?: string | null;
  /** Соседи в целевой колонке. Без соседей при переходе запись ставится в конец. */
  afterId?: string;
  beforeId?: string;
  expectedVersion?: number;
}

export function createItemRepository(options: ItemRepositoryOptions = {}) {
  const now = () => (options.now ? options.now() : new Date()).toISOString();
  const notify = (event: ItemsChangedEvent) => options.notify?.(event);
  let dbPromise: Promise<ItemsDb> | null = null;
  const db = () => (dbPromise ??= openItemsDb(options.dbName));

  const changeOf = (item: Item, op: ItemChangeOp, source: ItemSource): StoredChange => ({
    itemId: item.id,
    op,
    version: item.version,
    at: item.updatedAt,
    source,
  });

  /** Последний ключ порядка в группе (доска + статус), чтобы новая запись встала в конец */
  async function lastOrderIn(store: ItemWriteStore, status: string, boardId?: string) {
    const inStatus = await store.index('status').getAll(status);
    let last: string | undefined;
    for (const item of inStatus) {
      if (item.boardId === boardId && !item.deletedAt && (!last || item.order > last)) {
        last = item.order;
      }
    }
    return last;
  }

  async function trimChanges(store: ChangeWriteStore) {
    let excess = (await store.count()) - CHANGES_RETENTION;
    let cursor = excess > 0 ? await store.openCursor() : null;
    while (cursor && excess > 0) {
      await cursor.delete();
      excess--;
      cursor = await cursor.continue();
    }
  }

  /** Читает исходные версии и фиксирует изменения вместе с журналом в одной транзакции. */
  async function changeItems<Result>(
    op: ItemChangeOp,
    source: ItemSource,
    prepare: (store: ItemWriteStore) => Promise<{ result: Result; writes: Item[] }>,
  ): Promise<Result> {
    const database = await db();
    const tx = database.transaction(['items', 'changes'], 'readwrite');
    const store = tx.objectStore('items');
    const changes = tx.objectStore('changes');
    try {
      const { result, writes } = await prepare(store);
      let trim = false;
      for (const item of writes) {
        await store.put(item);
        const seq = await changes.add(changeOf(item, op, source));
        trim ||= seq % 100 === 0;
      }
      if (trim) await trimChanges(changes);
      await tx.done;
      if (writes.length) notify({ type: 'items-changed', itemIds: writes.map(({ id }) => id) });
      return result;
    } catch (error) {
      // Валидация заканчивается до записей. Ошибка запроса IndexedDB сама прерывает транзакцию.
      await tx.done.catch(() => undefined);
      throw error;
    }
  }

  async function requireItem(store: ItemWriteStore, id: string): Promise<Item> {
    const item = await store.get(id);
    if (!item) throw new ItemNotFoundError(id);
    return item;
  }

  function markDeleted(current: Item, timestamp: string): Item {
    return { ...current, deletedAt: timestamp, updatedAt: timestamp, version: current.version + 1 };
  }

  function clearDeleted(current: Item, timestamp: string): Item {
    const restored = { ...current, updatedAt: timestamp, version: current.version + 1 };
    delete restored.deletedAt;
    return restored;
  }

  function applyPatch(item: Item, patch: ItemPatch): Item {
    const next: Item = { ...item };
    const record = next as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) {
        if ((CLEARABLE_FIELDS as readonly string[]).includes(key) || key === 'archivedAt') {
          delete record[key];
        }
      } else {
        record[key] = value;
      }
    }
    return next;
  }

  function prepareUpdate(current: Item, patch: ItemPatch) {
    const next = applyPatch(current, patch);
    if (JSON.stringify(next) === JSON.stringify(current)) return { updated: current, writes: [] };
    next.updatedAt = now();
    next.version = current.version + 1;
    return { updated: next, writes: [next] };
  }

  async function orderForMove(
    store: ItemWriteStore,
    current: Item,
    { afterId, beforeId, status = current.status, boardId = current.boardId }: ItemMoveTarget,
  ): Promise<string> {
    const targetBoard = boardId ?? undefined;
    const neighborOrder = async (id: string | undefined) => {
      if (!id) return undefined;
      const neighbor = await store.get(id);
      if (
        !neighbor ||
        neighbor.deletedAt ||
        neighbor.archivedAt ||
        neighbor.id === current.id ||
        neighbor.boardId !== targetBoard ||
        neighbor.status !== status
      ) {
        throw new ItemConflictError(current);
      }
      return neighbor.order;
    };
    if (afterId || beforeId) {
      const [after, before] = await Promise.all([neighborOrder(afterId), neighborOrder(beforeId)]);
      if (after !== undefined && before !== undefined && after >= before)
        throw new ItemConflictError(current);
      return orderBetween(after, before);
    }
    if (current.status === status && current.boardId === targetBoard) return current.order;
    return orderBetween(await lastOrderIn(store, status, targetBoard));
  }

  return {
    async create(draftInput: ItemDraft, source: ItemSource): Promise<Item> {
      const draft = parseItemDraft(draftInput);
      return changeItems('create', source, async (store) => {
        const status = draft.status ?? DEFAULT_STATUS;
        const timestamp = now();
        const item: Item = {
          ...draft,
          id: ulid(Date.parse(timestamp)),
          status,
          order: draft.order ?? orderBetween(await lastOrderIn(store, status, draft.boardId)),
          tags: draft.tags ?? [],
          source,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        };
        return { result: item, writes: [item] };
      });
    },

    async get(id: string): Promise<Item | undefined> {
      return (await db()).get('items', id);
    },

    /** Только активные записи с напоминанием, в порядке индекса remindAt. */
    async listScheduledReminders(): Promise<Item[]> {
      const indexed = await (await db()).getAllFromIndex('items', 'remindAt');
      return indexed.filter(
        (item) => !item.archivedAt && !item.deletedAt && item.status !== 'done',
      );
    },

    /**
     * Изменение записи. expectedVersion — защита от перезаписи чужого изменения
     * (две вкладки, агент): при несовпадении — ItemConflictError с актуальной версией.
     */
    async update(
      id: string,
      patchInput: ItemPatch,
      source: ItemSource,
      expectedVersion?: number,
    ): Promise<Item> {
      const patch = parseItemPatch(patchInput);
      return changeItems('update', source, async (store) => {
        const current = await requireItem(store, id);
        if (current.deletedAt) throw new ItemNotFoundError(id);
        if (expectedVersion !== undefined && current.version !== expectedVersion) {
          throw new ItemConflictError(current);
        }
        // Изменение без фактических правок не создаёт версию, запись журнала и событие.
        const { updated, writes } = prepareUpdate(current, patch);
        return { result: updated, writes };
      });
    },

    async move(id: string, target: ItemMoveTarget, source: ItemSource) {
      const patch = parseItemPatch({ status: target.status, boardId: target.boardId });
      return changeItems('update', source, async (store) => {
        const current = await requireItem(store, id);
        if (current.deletedAt || current.archivedAt) throw new ItemNotFoundError(id);
        if (target.expectedVersion !== undefined && current.version !== target.expectedVersion) {
          throw new ItemConflictError(current);
        }
        const order = await orderForMove(store, current, {
          ...target,
          status: patch.status,
          boardId: patch.boardId,
        });
        const { updated, writes } = prepareUpdate(current, { ...patch, order });
        return { result: { current, updated }, writes };
      });
    },

    /** Мягкое удаление: запись уходит в корзину и восстанавливается restore */
    async remove(id: string, source: ItemSource): Promise<Item> {
      return changeItems('delete', source, async (store) => {
        const current = await requireItem(store, id);
        if (current.deletedAt) return { result: current, writes: [] };
        const removed = markDeleted(current, now());
        return { result: removed, writes: [removed] };
      });
    },

    async restore(id: string, source: ItemSource): Promise<Item> {
      return changeItems('restore', source, async (store) => {
        const current = await requireItem(store, id);
        if (!current.deletedAt) return { result: current, writes: [] };
        const restored = clearDeleted(current, now());
        return { result: restored, writes: [restored] };
      });
    },

    /** Одна операция для выделенных записей. Уже удалённые записи пропускаются. */
    async removeMany(ids: readonly string[], source: ItemSource): Promise<Item[]> {
      return changeItems('delete', source, async (store) => {
        const entries = await Promise.all([...new Set(ids)].map((id) => store.get(id)));
        const timestamp = now();
        const removed = entries.flatMap((item) =>
          item && !item.deletedAt ? [markDeleted(item, timestamp)] : [],
        );
        return { result: removed, writes: removed };
      });
    },

    /** Отменяет весь пакет только при совпадении каждой версии из корзины. */
    async restoreMany(
      previous: readonly Pick<Item, 'id' | 'version'>[],
      source: ItemSource,
    ): Promise<void> {
      return changeItems('restore', source, async (store) => {
        const timestamp = now();
        const restored = await Promise.all(
          previous.map(async ({ id, version }) => {
            const item = await requireItem(store, id);
            if (!item.deletedAt || item.version !== version) throw new ItemConflictError(item);
            return clearDeleted(item, timestamp);
          }),
        );
        return { result: undefined, writes: restored };
      });
    },

    /** Окончательно удаляет записи из корзины старше срока хранения; возвращает их число */
    async purgeDeleted(source: ItemSource, retentionMs = TRASH_RETENTION_MS): Promise<number> {
      const database = await db();
      const threshold = new Date(Date.parse(now()) - retentionMs).toISOString();
      const expired = await database.getAllFromIndex(
        'items',
        'deletedAt',
        IDBKeyRange.upperBound(threshold),
      );
      if (expired.length === 0) return 0;
      const tx = database.transaction(['items', 'changes'], 'readwrite');
      for (const item of expired) {
        await tx.objectStore('items').delete(item.id);
        await tx.objectStore('changes').add({ ...changeOf(item, 'purge', source), at: now() });
      }
      await tx.done;
      notify({ type: 'items-changed', itemIds: expired.map((item) => item.id) });
      return expired.length;
    },

    async query(query: ItemQuery = {}): Promise<Item[]> {
      const database = await db();
      const kinds = toSet(query.kind);
      const statuses = toSet(query.status);

      // Самый избирательный индекс — остальное фильтруется в памяти
      const onlyKind = kinds?.size === 1 ? [...kinds][0] : undefined;
      const onlyStatus = statuses?.size === 1 ? [...statuses][0] : undefined;
      let candidates: Item[];
      if (query.boardId !== undefined) {
        candidates = await database.getAllFromIndex('items', 'boardId', query.boardId);
      } else if (onlyKind) {
        candidates = await database.getAllFromIndex('items', 'kind', onlyKind);
      } else if (onlyStatus) {
        candidates = await database.getAllFromIndex('items', 'status', onlyStatus);
      } else {
        candidates = await database.getAll('items');
      }

      const result = candidates.filter((item) => {
        if (query.onlyDeleted) return Boolean(item.deletedAt);
        if (item.deletedAt && !query.includeDeleted) return false;
        if (item.archivedAt && !query.includeArchived) return false;
        if (kinds && !kinds.has(item.kind)) return false;
        if (statuses && !statuses.has(item.status)) return false;
        if (query.tag && !item.tags.includes(query.tag)) return false;
        return true;
      });

      const sort = query.sort ?? 'order';
      result.sort((a, b) =>
        sort === 'order'
          ? compare(a.order, b.order) || compare(a.id, b.id)
          : compare(b[sort], a[sort]),
      );
      return query.limit !== undefined ? result.slice(0, query.limit) : result;
    },

    /** Журнал изменений после seq (по возрастанию) — для отмены, аудита и синхронизации */
    async listChanges(sinceSeq = 0, limit = 500): Promise<ItemChange[]> {
      const database = await db();
      const changes: ItemChange[] = [];
      let cursor = await database
        .transaction('changes')
        .store.openCursor(IDBKeyRange.lowerBound(sinceSeq, true));
      while (cursor && changes.length < limit) {
        changes.push({ ...cursor.value, seq: cursor.key });
        cursor = await cursor.continue();
      }
      return changes;
    },

    async createBoard(draftInput: BoardDraft): Promise<Board> {
      const draft = parseBoardDraft(draftInput);
      const timestamp = now();
      const board: Board = {
        id: ulid(Date.parse(timestamp)),
        title: draft.title,
        columns: draft.columns ?? DEFAULT_COLUMNS,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await (await db()).put('boards', board);
      notify({ type: 'items-changed', itemIds: [], boards: true });
      return board;
    },

    async updateBoard(id: string, draftInput: Partial<BoardDraft>): Promise<Board> {
      const database = await db();
      const current = await database.get('boards', id);
      if (!current) throw new ItemNotFoundError(id);
      const draft = parseBoardDraft({ title: current.title, ...draftInput });
      const board: Board = { ...current, ...draft, updatedAt: now() };
      await database.put('boards', board);
      notify({ type: 'items-changed', itemIds: [], boards: true });
      return board;
    },

    /** Архивирует доску или возвращает из архива (записи доски не трогаются) */
    async setBoardArchived(id: string, archived: boolean): Promise<Board> {
      const database = await db();
      const current = await database.get('boards', id);
      if (!current) throw new ItemNotFoundError(id);
      const board: Board = { ...current, updatedAt: now() };
      if (archived) board.archivedAt = board.updatedAt;
      else delete board.archivedAt;
      await database.put('boards', board);
      notify({ type: 'items-changed', itemIds: [], boards: true });
      return board;
    },

    async getBoard(id: string): Promise<Board | undefined> {
      return (await db()).get('boards', id);
    },

    async listBoards(): Promise<Board[]> {
      const boards = await (await db()).getAll('boards');
      return boards
        .filter((board) => !board.archivedAt)
        .sort((a, b) => compare(a.createdAt, b.createdAt));
    },

    /**
     * Пакетная запись готовых записей и досок (миграция, импорт файла) одной транзакцией:
     * либо пишется всё вместе со служебной записью meta, либо ничего. Записи с тем же id
     * заменяются. Каждая запись проверяется полностью, включая служебные поля.
     */
    async importBatch(input: {
      items: readonly unknown[];
      boards: readonly unknown[];
      source: ItemSource;
      meta?: { key: string; value: unknown; keepExisting?: (value: unknown) => boolean };
    }): Promise<{ items: number; boards: number; previousMeta?: unknown }> {
      const items = input.items.map(parseStoredItem);
      const boards = input.boards.map(parseStoredBoard);
      const database = await db();
      const tx = database.transaction(['items', 'boards', 'changes', 'meta'], 'readwrite');
      try {
        const meta = input.meta;
        const metaStore = tx.objectStore('meta');
        if (meta?.keepExisting) {
          const previous = (await metaStore.get(meta.key))?.value;
          if (meta.keepExisting(previous)) {
            await tx.done;
            return { items: 0, boards: 0, previousMeta: previous };
          }
        }
        for (const board of boards) await tx.objectStore('boards').put(board);
        for (const item of items) {
          await tx.objectStore('items').put(item);
          await tx
            .objectStore('changes')
            .add({ ...changeOf(item, 'create', input.source), at: now() });
        }
        if (meta) await metaStore.put({ key: meta.key, value: meta.value });
        await tx.done;
      } catch (error) {
        await tx.done.catch(() => undefined);
        throw error;
      }
      notify({
        type: 'items-changed',
        itemIds: items.map((item) => item.id),
        boards: boards.length > 0,
      });
      return { items: items.length, boards: boards.length };
    },

    /** Все записи (кроме корзины) и доски — для экспорта в файл */
    async exportAll(): Promise<{ items: Item[]; boards: Board[] }> {
      const database = await db();
      const [items, boards] = await Promise.all([
        database.getAll('items'),
        database.getAll('boards'),
      ]);
      return { items: items.filter((item) => !item.deletedAt), boards };
    },

    async getMeta(key: string): Promise<unknown> {
      return (await (await db()).get('meta', key))?.value;
    },

    /** Закрывает соединение (тесты, удаление базы) */
    async close(): Promise<void> {
      if (dbPromise) (await dbPromise).close();
      dbPromise = null;
    },
  };
}

export type ItemRepository = ReturnType<typeof createItemRepository>;

function toSet<T extends string>(value: T | readonly T[] | undefined): Set<T> | undefined {
  if (value === undefined) return undefined;
  return new Set(typeof value === 'string' ? [value] : value);
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
