import { asRecord } from './jsonReaders.js';
import { isSafeHttpUrl } from './url.js';
import { isValidOrderKey } from './ids.js';
import {
  ITEM_KINDS,
  ITEM_PRIORITIES,
  SOURCE_TYPES,
  type Board,
  type Item,
  type ItemSource,
  type ItemSourceType,
  CLEARABLE_FIELDS,
  type BoardColumn,
  type BoardDraft,
  type ItemDraft,
  type ItemAssignee,
  type ItemKind,
  type ItemPatch,
  type ItemPriority,
} from './types.js';

/**
 * Проверка всего, что входит в хранилище: ввод пользователя, импорт, а на этапах 3–5 —
 * агенты и коннекторы. Вход — unknown: недоверенные данные проверяются здесь один раз,
 * дальше код работает с типизированным значением.
 */

export const ITEM_LIMITS = {
  titleLength: 500,
  bodyLength: 100_000,
  agentCommentLength: 4_000,
  urlLength: 2_048,
  tags: 20,
  tagLength: 40,
  idLength: 64,
  boardColumns: 20,
} as const;

export type ItemValidationCode =
  | 'not-object'
  | 'kind'
  | 'title'
  | 'body'
  | 'url'
  | 'status'
  | 'board'
  | 'order'
  | 'priority'
  | 'date'
  | 'tags'
  | 'flag'
  | 'columns'
  | 'id'
  | 'version'
  | 'source';

export function isItemAssignee(value: unknown): value is ItemAssignee {
  return typeof value === 'string' && /^agent:[A-Za-z0-9_-]{1,64}$/.test(value);
}

export class ItemValidationError extends Error {
  constructor(
    public readonly code: ItemValidationCode,
    public readonly field: string,
  ) {
    super(`Недопустимое значение поля «${field}» (${code})`);
    this.name = 'ItemValidationError';
  }
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const fail = (code: ItemValidationCode, field: string): never => {
  throw new ItemValidationError(code, field);
};

function readText(
  value: unknown,
  field: string,
  max: number,
  required: boolean,
): string | undefined {
  if (value === undefined && !required) return undefined;
  const isTitle = field === 'title';
  const code: ItemValidationCode = isTitle ? 'title' : 'body';
  if (typeof value !== 'string') return fail(code, field);
  // Заголовок не может быть пустым, даже в изменении; тело — может (очищенная заметка)
  const text = isTitle ? value.trim() : value;
  if ((isTitle && text.length === 0) || text.length > max) return fail(code, field);
  return text;
}

function readId(value: unknown, field: string, code: ItemValidationCode): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) return fail(code, field);
  return value;
}

function readDate(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 40 || Number.isNaN(Date.parse(value))) {
    return fail('date', field);
  }
  return new Date(value).toISOString();
}

function readTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > ITEM_LIMITS.tags) return fail('tags', 'tags');
  const tags = value.map((tag) => {
    if (typeof tag !== 'string') return fail('tags', 'tags');
    const trimmed = tag.trim();
    if (trimmed.length === 0 || trimmed.length > ITEM_LIMITS.tagLength) return fail('tags', 'tags');
    return trimmed;
  });
  return Array.from(new Set(tags));
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  code: ItemValidationCode,
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !allowed.includes(value as T)) return fail(code, field);
  return value as T;
}

/** Общая часть черновика и изменения: все поля необязательны */
function readOptionalFields(input: Record<string, unknown>) {
  const url = input.url;
  if (
    url !== undefined &&
    (typeof url !== 'string' || url.length > ITEM_LIMITS.urlLength || !isSafeHttpUrl(url))
  ) {
    fail('url', 'url');
  }
  const order = input.order;
  if (order !== undefined && (typeof order !== 'string' || !isValidOrderKey(order))) {
    fail('order', 'order');
  }
  const pinned = input.pinned;
  if (pinned !== undefined && typeof pinned !== 'boolean') fail('flag', 'pinned');
  const assignee = input.assignee;
  if (assignee !== undefined && !isItemAssignee(assignee)) fail('id', 'assignee');

  return {
    body: readText(input.body, 'body', ITEM_LIMITS.bodyLength, false),
    url: url as string | undefined,
    status: readId(input.status, 'status', 'status'),
    boardId: readId(input.boardId, 'boardId', 'board'),
    order: order as string | undefined,
    priority: readEnum<ItemPriority>(input.priority, ITEM_PRIORITIES, 'priority', 'priority'),
    dueAt: readDate(input.dueAt, 'dueAt'),
    remindAt: readDate(input.remindAt, 'remindAt'),
    tags: readTags(input.tags),
    pinned: pinned as boolean | undefined,
    assignee: assignee as ItemAssignee | undefined,
    agentComment: readText(
      input.agentComment,
      'agentComment',
      ITEM_LIMITS.agentCommentLength,
      false,
    ),
  };
}

/** Убирает ключи со значением undefined, чтобы они не затирали поля при слиянии */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export function parseItemDraft(input: unknown): ItemDraft {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return fail('not-object', 'item');
  }
  const record = asRecord(input);
  const kind = readEnum<ItemKind>(record.kind, ITEM_KINDS, 'kind', 'kind') ?? fail('kind', 'kind');
  const title =
    readText(record.title, 'title', ITEM_LIMITS.titleLength, true) ?? fail('title', 'title');
  return compact({ kind, title, ...readOptionalFields(record) });
}

export function parseItemPatch(input: unknown): ItemPatch {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return fail('not-object', 'patch');
  }
  const record = { ...asRecord(input) };
  // null очищает поле: такие ключи проверяются отдельно и не проходят через валидаторы значений
  const cleared = CLEARABLE_FIELDS.filter((field) => record[field] === null);
  for (const field of cleared) delete record[field];

  const archivedAt = record.archivedAt === null ? null : readDate(record.archivedAt, 'archivedAt');
  const patch: ItemPatch = compact({
    title: readText(record.title, 'title', ITEM_LIMITS.titleLength, false),
    ...readOptionalFields(record),
    archivedAt,
  });
  for (const field of cleared) patch[field] = null;
  return patch;
}

function readColumns(value: unknown): BoardColumn[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.length > ITEM_LIMITS.boardColumns) {
    return fail('columns', 'columns');
  }
  const columns = value.map((raw): BoardColumn => {
    const column = asRecord(raw);
    const id = readId(column.id, 'columns.id', 'columns') ?? fail('columns', 'columns.id');
    const title =
      readText(column.title, 'title', ITEM_LIMITS.titleLength, true) ?? fail('columns', 'title');
    const wip = column.wipLimit;
    if (wip !== undefined && (typeof wip !== 'number' || !Number.isInteger(wip) || wip < 1)) {
      fail('columns', 'columns.wipLimit');
    }
    return compact({ id, title, wipLimit: wip as number | undefined });
  });
  if (new Set(columns.map((c) => c.id)).size !== columns.length) fail('columns', 'columns.id');
  return columns;
}

export function parseBoardDraft(input: unknown): BoardDraft {
  const record = asRecord(input);
  const title =
    readText(record.title, 'title', ITEM_LIMITS.titleLength, true) ?? fail('title', 'title');
  return compact({ title, columns: readColumns(record.columns) });
}

/** Записи, приходящие целиком (импорт файла, миграция): служебные поля проверяются тоже */

function readRequiredDate(value: unknown, field: string): string {
  return readDate(value, field) ?? fail('date', field);
}

function readSource(value: unknown): ItemSource {
  const record = asRecord(value);
  const type = readEnum<ItemSourceType>(record.type, SOURCE_TYPES, 'source.type', 'source');
  const id = readId(record.id, 'source.id', 'source');
  const name = record.name;
  if (!type || !id || typeof name !== 'string' || name.length > ITEM_LIMITS.titleLength) {
    return fail('source', 'source');
  }
  return { type, id, name };
}

export function parseStoredItem(input: unknown): Item {
  const draft = parseItemDraft(input);
  const record = asRecord(input);
  const id = readId(record.id, 'id', 'id') ?? fail('id', 'id');
  const version = record.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail('version', 'version');
  }
  const item: Item = {
    ...draft,
    id,
    status: draft.status ?? fail('status', 'status'),
    order: draft.order ?? fail('order', 'order'),
    tags: draft.tags ?? [],
    source: readSource(record.source),
    createdAt: readRequiredDate(record.createdAt, 'createdAt'),
    updatedAt: readRequiredDate(record.updatedAt, 'updatedAt'),
    version,
  };
  const archivedAt = readDate(record.archivedAt, 'archivedAt');
  const deletedAt = readDate(record.deletedAt, 'deletedAt');
  if (archivedAt) item.archivedAt = archivedAt;
  if (deletedAt) item.deletedAt = deletedAt;
  return item;
}

export function parseStoredBoard(input: unknown): Board {
  const draft = parseBoardDraft(input);
  const record = asRecord(input);
  const board: Board = {
    id: readId(record.id, 'id', 'id') ?? fail('id', 'id'),
    title: draft.title,
    columns: draft.columns ?? fail('columns', 'columns'),
    createdAt: readRequiredDate(record.createdAt, 'createdAt'),
    updatedAt: readRequiredDate(record.updatedAt, 'updatedAt'),
  };
  const archivedAt = readDate(record.archivedAt, 'archivedAt');
  if (archivedAt) board.archivedAt = archivedAt;
  return board;
}
