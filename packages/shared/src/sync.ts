import { asRecord } from './jsonReaders.js';
import { type Board, type Item } from './types.js';
import { parseStoredBoard, parseStoredItem } from './validation.js';

export const HUB_API_VERSION = 'v1';
export const HUB_DEFAULT_ORIGIN = 'http://127.0.0.1:47831';
export const HUB_BODY_LIMIT = 256 * 1024;
export const HUB_SYNC_BATCH = 50;

type Snapshot =
  | { entity: 'item'; op: 'upsert'; value: Item }
  | { entity: 'board'; op: 'upsert'; value: Board }
  | { entity: 'item' | 'board'; op: 'delete'; value: null };

export type HubSyncSnapshot = Snapshot & { id: string; version: number };
export type HubChange = HubSyncSnapshot & { seq: number };
export type HubPushChange = HubSyncSnapshot & { idempotencyKey: string };

export interface HubChangePage {
  changes: HubChange[];
  nextSince: number;
  hasMore: boolean;
}

export interface HubPushResult {
  idempotencyKey: string;
  applied: boolean;
  version: number;
  value: Item | Board | null;
}

export function readHubSequence(value: unknown, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error('Недопустимый номер версии Hub');
  }
  return value;
}

export function parseHubSyncSnapshot(raw: unknown): HubSyncSnapshot {
  const { entity, id, op, value, version } = asRecord(raw);
  if (
    (entity !== 'item' && entity !== 'board') ||
    typeof id !== 'string' ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(id)
  ) {
    throw new Error('Недопустимая запись Hub');
  }
  const fields = { id, version: readHubSequence(version, 1) };
  if (op === 'delete' && value === null) return { ...fields, entity, op, value };
  if (op !== 'upsert') throw new Error('Недопустимое действие Hub');
  if (entity === 'board') {
    const board = parseStoredBoard(value);
    if (board.id !== id) throw new Error('Идентификатор доски Hub не совпадает');
    return { ...fields, entity, op, value: board };
  }
  const item = parseStoredItem(value);
  if (item.id !== id || item.version !== fields.version) {
    throw new Error('Версия или идентификатор элемента Hub не совпадают');
  }
  return { ...fields, entity, op, value: item };
}

export function parseHubChangePage(raw: unknown, since: number, limit: number): HubChangePage {
  const { changes, nextSince, hasMore } = asRecord(raw);
  if (!Array.isArray(changes) || changes.length > limit || typeof hasMore !== 'boolean') {
    throw new Error('Недопустимая страница журнала Hub');
  }
  let previous = since;
  const entries = changes.map((row): HubChange => {
    const seq = readHubSequence(asRecord(row).seq, previous + 1);
    previous = seq;
    return { ...parseHubSyncSnapshot(row), seq };
  });
  if (nextSince !== previous || (hasMore && entries.length === 0)) {
    throw new Error('Курсор Hub не совпадает с журналом');
  }
  return { changes: entries, nextSince, hasMore };
}
