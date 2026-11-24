import {
  HUB_SYNC_BATCH,
  ITEM_KINDS,
  ItemValidationError,
  parseBoardDraft,
  parseHubSyncSnapshot,
  parseItemDraft,
  parseItemPatch,
  type ItemKind,
} from '@dashflow/shared';

export type HttpErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_ERROR';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: HttpErrorCode,
    message: string,
    readonly details?: { field: string } | { version: number },
  ) {
    super(message);
  }
}

export const invalid = (field: string): never => {
  throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid request', { field });
};

export function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('body');
  for (const key of Object.keys(value)) {
    if (!fields.includes(key)) return invalid('body');
  }
  return value as Record<string, unknown>;
}

export function safeId(value: unknown, field = 'id'): string {
  if (typeof value !== 'string' || !/^[a-z0-9_-]{1,64}$/i.test(value)) return invalid(field);
  return value;
}

export function idempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[\w.-]{1,100}$/.test(value)) return invalid('idempotencyKey');
  return value;
}

export function integer(value: unknown, field: string, min: number, max = Number.MAX_SAFE_INTEGER) {
  const numeric = typeof value === 'string' && /^\d{1,16}$/.test(value) ? Number(value) : value;
  if (
    typeof numeric !== 'number' ||
    !Number.isSafeInteger(numeric) ||
    numeric < min ||
    numeric > max
  ) {
    return invalid(field);
  }
  return numeric;
}

export function parseVersion(value: unknown) {
  const version = typeof value === 'string' ? (/^"(\d+)"$/.exec(value)?.[1] ?? value) : value;
  return integer(version, 'If-Match', 1);
}

export function text(value: unknown, field: string, max: number) {
  // eslint-disable-next-line no-control-regex -- Поле не должно содержать управляющие символы.
  const control = /[\u0000-\u001f\u007f]/;
  if (typeof value !== 'string' || !value.trim() || value.length > max || control.test(value)) {
    return invalid(field);
  }
  return value.trim();
}

const draftFields = [
  'title',
  'body',
  'url',
  'status',
  'boardId',
  'order',
  'priority',
  'dueAt',
  'remindAt',
  'tags',
  'pinned',
];
export const createDraft = (value: unknown) =>
  parseItemDraft(object(value, ['kind', ...draftFields]));
export const updateDraft = (value: unknown) => {
  const patch = parseItemPatch(object(value, [...draftFields, 'archivedAt']));
  if (!Object.keys(patch).length) return invalid('body');
  return patch;
};

export function boardDraft(value: unknown) {
  return parseBoardDraft(object(value, ['title', 'columns']));
}

export function boardPatch(value: unknown) {
  const patch = object(value, ['title', 'columns', 'archivedAt']);
  if (!Object.keys(patch).length) return invalid('body');
  const { archivedAt } = patch;
  const { title, columns } = parseBoardDraft({ title: patch.title ?? '.', columns: patch.columns });
  if (patch.title === null) return invalid('title');
  const archive =
    archivedAt === null || archivedAt === undefined ? archivedAt : parseIsoDate(archivedAt);
  return {
    ...(patch.title === undefined ? {} : { title }),
    ...(columns === undefined ? {} : { columns }),
    ...(archive === undefined ? {} : { archivedAt: archive }),
  };
}

function parseIsoDate(value: unknown): string {
  if (typeof value !== 'string' || value.length > 40 || Number.isNaN(Date.parse(value))) {
    return invalid('archivedAt');
  }
  return new Date(value).toISOString();
}

export function itemQuery(value: unknown) {
  const q = object(value, ['kind', 'status', 'boardId', 'q', 'cursor', 'limit']);
  const kind = ITEM_KINDS.find((entry): entry is ItemKind => entry === q.kind);
  if (q.kind !== undefined && !kind) return invalid('kind');
  return {
    kind,
    status: q.status === undefined ? undefined : safeId(q.status, 'status'),
    boardId: q.boardId === undefined ? undefined : safeId(q.boardId, 'boardId'),
    q: q.q === undefined ? undefined : text(q.q, 'q', 200),
    cursor: q.cursor === undefined ? undefined : text(q.cursor, 'cursor', 512),
    limit: q.limit === undefined ? undefined : integer(q.limit, 'limit', 1, 100),
  };
}

export function changesQuery(value: unknown) {
  const query = object(value, ['since', 'limit']);
  return {
    since: query.since === undefined ? 0 : integer(query.since, 'since', 0),
    limit: query.limit === undefined ? 100 : integer(query.limit, 'limit', 1, 100),
  };
}

export function syncChanges(value: unknown) {
  const { changes } = object(value, ['changes']);
  if (!Array.isArray(changes) || !changes.length || changes.length > HUB_SYNC_BATCH)
    return invalid('changes');
  return changes.map((raw: unknown) => {
    const input = object(raw, ['idempotencyKey', 'entity', 'op', 'id', 'version', 'value']);
    const key = idempotencyKey(input.idempotencyKey);
    try {
      return { ...parseHubSyncSnapshot(input), idempotencyKey: key };
    } catch (error) {
      if (error instanceof ItemValidationError) throw error;
      return invalid('changes');
    }
  });
}

export function itemValidationError(error: unknown): HttpError | undefined {
  return error instanceof ItemValidationError
    ? new HttpError(400, 'VALIDATION_FAILED', 'Invalid request', { field: error.field })
    : undefined;
}
