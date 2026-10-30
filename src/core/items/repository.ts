import { openItemsDb, type ItemsDb, type StoredChange } from './db';
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
import { parseBoardDraft, parseItemDraft, parseItemPatch } from './validation';

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

export interface ItemRepositoryOptions {
  dbName?: string;
  now?: () => Date;
  notify?: (event: ItemsChangedEvent) => void;
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
  async function lastOrderIn(database: ItemsDb, status: string, boardId?: string) {
    const inStatus = await database.getAllFromIndex('items', 'status', status);
    let last: string | undefined;
    for (const item of inStatus) {
      if (item.boardId === boardId && !item.deletedAt && (!last || item.order > last)) {
        last = item.order;
      }
    }
    return last;
  }

  async function trimChanges(database: ItemsDb, seq: number) {
    if (seq % 100 !== 0) return;
    const tx = database.transaction('changes', 'readwrite');
    let excess = (await tx.store.count()) - CHANGES_RETENTION;
    let cursor = await tx.store.openCursor();
    while (cursor && excess > 0) {
      await cursor.delete();
      excess--;
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  /** Записывает версию записи и строку журнала одной транзакцией */
  async function writeItem(item: Item, op: ItemChangeOp, source: ItemSource) {
    const database = await db();
    const tx = database.transaction(['items', 'changes'], 'readwrite');
    await tx.objectStore('items').put(item);
    const seq = await tx.objectStore('changes').add(changeOf(item, op, source));
    await tx.done;
    await trimChanges(database, seq);
    notify({ type: 'items-changed', itemIds: [item.id] });
    return item;
  }

  async function requireItem(id: string): Promise<Item> {
    const item = await (await db()).get('items', id);
    if (!item) throw new ItemNotFoundError(id);
    return item;
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

  return {
    async create(draftInput: ItemDraft, source: ItemSource): Promise<Item> {
      const draft = parseItemDraft(draftInput);
      const database = await db();
      const status = draft.status ?? DEFAULT_STATUS;
      const timestamp = now();
      const item: Item = {
        ...draft,
        id: ulid(Date.parse(timestamp)),
        status,
        order: draft.order ?? orderBetween(await lastOrderIn(database, status, draft.boardId)),
        tags: draft.tags ?? [],
        source,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
      };
      return writeItem(item, 'create', source);
    },

    async get(id: string): Promise<Item | undefined> {
      return (await db()).get('items', id);
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
      const current = await requireItem(id);
      if (current.deletedAt) throw new ItemNotFoundError(id);
      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        throw new ItemConflictError(current);
      }
      const next = applyPatch(current, patch);
      // Изменение без фактических правок не создаёт версию, запись журнала и событие
      if (JSON.stringify(next) === JSON.stringify(current)) return current;
      next.updatedAt = now();
      next.version = current.version + 1;
      return writeItem(next, 'update', source);
    },

    /** Мягкое удаление: запись уходит в корзину и восстанавливается restore */
    async remove(id: string, source: ItemSource): Promise<Item> {
      const current = await requireItem(id);
      if (current.deletedAt) return current;
      const timestamp = now();
      return writeItem(
        { ...current, deletedAt: timestamp, updatedAt: timestamp, version: current.version + 1 },
        'delete',
        source,
      );
    },

    async restore(id: string, source: ItemSource): Promise<Item> {
      const current = await requireItem(id);
      if (!current.deletedAt) return current;
      const restored: Item = { ...current, updatedAt: now(), version: current.version + 1 };
      delete restored.deletedAt;
      return writeItem(restored, 'restore', source);
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
