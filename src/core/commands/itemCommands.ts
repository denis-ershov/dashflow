import {
  ItemValidationError,
  ItemConflictError,
  ItemNotFoundError,
  parseBoardDraft,
  parseItemDraft,
  parseItemPatch,
  type Board,
  type BoardDraft,
  type Item,
  type ItemDraft,
  type ItemMoveTarget,
  type ItemPatch,
} from '@/core/items';
import { asRecord } from '@/core/network/jsonReaders';
import type { CommandContext, CommandDefinition, CommandOutcome } from './types';

/**
 * Команды над Item и досками. Отмена не перезаписывает чужие правки: перед откатом она
 * проверяет, что затронутые поля всё ещё в том виде, который оставила команда. Если запись
 * успели изменить (другая вкладка, агент, синхронизация) — UndoConflictError, и пользователь
 * видит «Не удалось отменить: запись уже изменена».
 */

export class UndoConflictError extends Error {
  constructor(public readonly itemId: string) {
    super(`Отмена невозможна: запись ${itemId} уже изменена`);
    this.name = 'UndoConflictError';
  }
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function readId(value: unknown, field = 'id'): string {
  if (typeof value !== 'string' || !ID.test(value)) throw new ItemValidationError('board', field);
  return value;
}

function readOptionalId(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : readId(value, field);
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Значения полей до изменения: отсутствующее поле — null (очистить при отмене) */
function snapshot(item: Item, patch: ItemPatch): ItemPatch {
  const record = item as unknown as Record<string, unknown>;
  return Object.fromEntries(Object.keys(patch).map((key) => [key, record[key] ?? null]));
}

/**
 * Откатывает поля к before, если они всё ещё равны after. Так отмена не затирает
 * правку, сделанную после команды.
 */
async function revertFields(ctx: CommandContext, id: string, after: Item, before: ItemPatch) {
  const current = await ctx.repository.get(id);
  if (!current || current.deletedAt) throw new UndoConflictError(id);
  const currentRecord = current as unknown as Record<string, unknown>;
  const afterRecord = after as unknown as Record<string, unknown>;
  for (const key of Object.keys(before)) {
    if (!sameValue(currentRecord[key], afterRecord[key])) throw new UndoConflictError(id);
  }
  try {
    await ctx.repository.update(id, before, ctx.source, current.version);
  } catch (error) {
    if (error instanceof ItemConflictError || error instanceof ItemNotFoundError) {
      throw new UndoConflictError(id);
    }
    throw error;
  }
}

/** Изменение с обратным действием; пустое изменение отменять нечего */
async function updateWithUndo(
  ctx: CommandContext,
  id: string,
  patch: ItemPatch,
): Promise<CommandOutcome<Item>> {
  const current = await ctx.repository.get(id);
  const before = current ? snapshot(current, patch) : {};
  const updated = await ctx.repository.update(id, patch, ctx.source, current?.version);
  if (!current || updated.version === current.version) return { result: updated };
  return {
    result: updated,
    undo: () => revertFields(ctx, id, updated, before),
    label: { key: 'commands.updated', params: { title: updated.title } },
  };
}

interface IdPayload {
  id: string;
}
const readIdPayload = (payload: unknown): IdPayload => ({ id: readId(asRecord(payload).id) });

export const itemCreate: CommandDefinition<ItemDraft, Item> = {
  type: 'item.create',
  validate: parseItemDraft,
  async execute(draft, ctx) {
    const item = await ctx.repository.create(draft, ctx.source);
    return {
      result: item,
      undo: async () => {
        const current = await ctx.repository.get(item.id);
        if (!current || current.deletedAt) throw new UndoConflictError(item.id);
        await ctx.repository.remove(item.id, ctx.source);
      },
      label: { key: 'commands.created', params: { title: item.title } },
    };
  },
};

export const itemUpdate: CommandDefinition<{ id: string; patch: ItemPatch }, Item> = {
  type: 'item.update',
  validate: (payload) => {
    const record = asRecord(payload);
    return { id: readId(record.id), patch: parseItemPatch(record.patch) };
  },
  execute: ({ id, patch }, ctx) => updateWithUndo(ctx, id, patch),
};

interface MovePayload extends ItemMoveTarget {
  id: string;
}

export const itemMove: CommandDefinition<MovePayload, Item> = {
  type: 'item.move',
  validate: (payload) => {
    const record = asRecord(payload);
    const patch = parseItemPatch({ status: record.status, boardId: record.boardId });
    const expectedVersion = record.expectedVersion;
    if (
      expectedVersion !== undefined &&
      (typeof expectedVersion !== 'number' ||
        !Number.isSafeInteger(expectedVersion) ||
        expectedVersion < 1)
    ) {
      throw new ItemValidationError('version', 'expectedVersion');
    }
    return {
      id: readId(record.id),
      status: patch.status,
      boardId: patch.boardId,
      afterId: readOptionalId(record.afterId, 'afterId'),
      beforeId: readOptionalId(record.beforeId, 'beforeId'),
      expectedVersion,
    };
  },
  async execute({ id, ...target }, ctx) {
    const { current, updated } = await ctx.repository.move(id, target, ctx.source);
    if (current.version === updated.version) return { result: current };
    const before: ItemPatch = {};
    if (current.order !== updated.order) before.order = current.order;
    if (current.status !== updated.status) before.status = current.status;
    if (current.boardId !== updated.boardId) before.boardId = current.boardId ?? null;
    return {
      result: updated,
      undo: () => revertFields(ctx, id, updated, before),
      label: { key: 'commands.moved', params: { title: updated.title } },
    };
  },
};

export const itemComplete: CommandDefinition<{ id: string; done: boolean }, Item> = {
  type: 'item.complete',
  validate: (payload) => {
    const record = asRecord(payload);
    if (typeof record.done !== 'boolean') throw new ItemValidationError('flag', 'done');
    return { id: readId(record.id), done: record.done };
  },
  execute: ({ id, done }, ctx) => updateWithUndo(ctx, id, { status: done ? 'done' : 'todo' }),
};

export const itemSnooze: CommandDefinition<{ id: string; until: string }, Item> = {
  type: 'item.snooze',
  validate: (payload) => {
    const record = asRecord(payload);
    const patch = parseItemPatch({ remindAt: record.until });
    if (!patch.remindAt) throw new ItemValidationError('date', 'until');
    return { id: readId(record.id), until: patch.remindAt };
  },
  execute: ({ id, until }, ctx) => updateWithUndo(ctx, id, { remindAt: until }),
};

export const itemArchive: CommandDefinition<IdPayload, Item> = {
  type: 'item.archive',
  validate: readIdPayload,
  async execute({ id }, ctx) {
    const outcome = await updateWithUndo(ctx, id, { archivedAt: new Date().toISOString() });
    return {
      ...outcome,
      label: { key: 'commands.archived', params: { title: outcome.result.title } },
    };
  },
};

export const itemDelete: CommandDefinition<IdPayload, Item> = {
  type: 'item.delete',
  validate: readIdPayload,
  async execute({ id }, ctx) {
    const [removed] = await ctx.repository.removeMany([id], ctx.source);
    if (!removed) {
      const current = await ctx.repository.get(id);
      if (!current) throw new ItemNotFoundError(id);
      return { result: current };
    }
    return {
      result: removed,
      undo: () => restoreDeleted(ctx, [removed]),
      label: { key: 'commands.deleted', params: { title: removed.title } },
    };
  },
};

async function restoreDeleted(ctx: CommandContext, removed: readonly Item[]): Promise<void> {
  try {
    await ctx.repository.restoreMany(removed, ctx.source);
  } catch (error) {
    if (error instanceof ItemConflictError) throw new UndoConflictError(error.current.id);
    if (error instanceof ItemNotFoundError) throw new UndoConflictError(error.itemId);
    throw error;
  }
}

export const itemDeleteMany: CommandDefinition<{ ids: string[] }, number> = {
  type: 'item.deleteMany',
  validate(payload) {
    const { ids } = asRecord(payload);
    if (!Array.isArray(ids)) throw new ItemValidationError('id', 'ids');
    return { ids: [...new Set(ids.map((id: unknown) => readId(id)))] };
  },
  async execute({ ids }, ctx) {
    const removed = await ctx.repository.removeMany(ids, ctx.source);
    if (!removed.length) return { result: 0 };
    return { result: removed.length, undo: () => restoreDeleted(ctx, removed) };
  },
};

export const itemRestore: CommandDefinition<IdPayload, Item> = {
  type: 'item.restore',
  validate: readIdPayload,
  async execute({ id }, ctx) {
    const restored = await ctx.repository.restore(id, ctx.source);
    return {
      result: restored,
      undo: async () => {
        const current = await ctx.repository.get(id);
        if (!current || current.deletedAt) throw new UndoConflictError(id);
        await ctx.repository.remove(id, ctx.source);
      },
      label: { key: 'commands.restored', params: { title: restored.title } },
    };
  },
};

export const boardCreate: CommandDefinition<BoardDraft, Board> = {
  type: 'board.create',
  validate: parseBoardDraft,
  async execute(draft, ctx) {
    const board = await ctx.repository.createBoard(draft);
    return {
      result: board,
      undo: async () => {
        await ctx.repository.setBoardArchived(board.id, true);
      },
      label: { key: 'commands.boardCreated', params: { title: board.title } },
    };
  },
};

export const boardUpdate: CommandDefinition<{ id: string; draft: Partial<BoardDraft> }, Board> = {
  type: 'board.update',
  validate: (payload) => {
    const record = asRecord(payload);
    const draft = asRecord(record.draft);
    // Проверяем только переданные поля: заголовок подставляется временно для parseBoardDraft
    const parsed = parseBoardDraft({ title: draft.title ?? '-', columns: draft.columns });
    const result: Partial<BoardDraft> = {};
    if (draft.title !== undefined) result.title = parsed.title;
    if (parsed.columns) result.columns = parsed.columns;
    return { id: readId(record.id), draft: result };
  },
  async execute({ id, draft }, ctx) {
    const previous = await ctx.repository.getBoard(id);
    const board = await ctx.repository.updateBoard(id, draft);
    if (!previous) return { result: board };
    return {
      result: board,
      undo: async () => {
        await ctx.repository.updateBoard(id, { title: previous.title, columns: previous.columns });
      },
      label: { key: 'commands.boardUpdated', params: { title: board.title } },
    };
  },
};

export const ITEM_COMMANDS = [
  itemCreate,
  itemUpdate,
  itemMove,
  itemComplete,
  itemSnooze,
  itemArchive,
  itemDelete,
  itemDeleteMany,
  itemRestore,
  boardCreate,
  boardUpdate,
] as const;
