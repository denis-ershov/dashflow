import { asRecord } from '@/core/network/jsonReaders';
import { isSafeHttpUrl } from '@/core/network/url';
import { isValidOrderKey } from './ids';
import {
  ITEM_KINDS,
  ITEM_PRIORITIES,
  CLEARABLE_FIELDS,
  type BoardColumn,
  type BoardDraft,
  type ItemDraft,
  type ItemKind,
  type ItemPatch,
  type ItemPriority,
} from './types';

/**
 * Проверка всего, что входит в хранилище: ввод пользователя, импорт, а на этапах 3–5 —
 * агенты и коннекторы. Вход — unknown: недоверенные данные проверяются здесь один раз,
 * дальше код работает с типизированным значением.
 */

export const ITEM_LIMITS = {
  titleLength: 500,
  bodyLength: 100_000,
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
  | 'columns';

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
