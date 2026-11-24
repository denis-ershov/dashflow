import { DatabaseSync } from 'node:sqlite';
import {
  HUB_SYNC_BATCH,
  orderBetween,
  parseBoardDraft,
  parseItemDraft,
  parseItemPatch,
  parseHubSyncSnapshot,
  parseStoredBoard,
  parseStoredItem,
  ulid,
  type Board,
  type Item,
  type ItemSource,
  type HubChangePage,
} from '@dashflow/shared';
import { Credentials, digest } from './credentials.js';
import { migrate, transaction } from './schema.js';
import {
  HubDbError,
  type Actor,
  type Entity,
  type ListItemsQuery,
  type PushChange,
  type PushResult,
} from './types.js';

export * from './types.js';

type Value = Item | Board | null;
type Row = { payload: string; owner_id: string; version: number; deleted_at: string | null };
const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];

function readVersion(value: number, minimum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value >= Number.MAX_SAFE_INTEGER) {
    throw new HubDbError('VALIDATION_FAILED', 'Invalid version or sequence');
  }
  return value;
}

function pageSize(value: number | undefined, maximum: number): number {
  if (value === undefined) return Math.min(50, maximum);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new HubDbError('VALIDATION_FAILED', 'Invalid page size');
  }
  return value;
}

function encodeCursor({ updatedAt, id }: Item): string {
  return Buffer.from(JSON.stringify([updatedAt, id])).toString('base64url');
}

function decodeCursor(cursor: string): [string, string] {
  try {
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(cursor)) throw new Error('Invalid encoding');
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (
      Array.isArray(decoded) &&
      decoded.length === 2 &&
      typeof decoded[0] === 'string' &&
      new Date(decoded[0]).toISOString() === decoded[0] &&
      typeof decoded[1] === 'string' &&
      /^[A-Za-z0-9_-]{1,64}$/.test(decoded[1])
    ) {
      return [decoded[0], decoded[1]];
    }
  } catch {
    throw new HubDbError('VALIDATION_FAILED', 'Invalid item cursor');
  }
  throw new HubDbError('VALIDATION_FAILED', 'Invalid item cursor');
}

function sourceOf({ id, name, type }: Actor): ItemSource {
  return { id, name, type };
}

function itemFromRow(row: Row): Item {
  return parseStoredItem(JSON.parse(row.payload));
}

function boardFromRow(row: Row): Board {
  return parseStoredBoard(JSON.parse(row.payload));
}

function readPushValue(change: PushChange): Value {
  try {
    readVersion(change.version, 1);
    const { value } = parseHubSyncSnapshot(change);
    if (value && 'deletedAt' in value) throw new Error('Expected a tombstone');
    return value;
  } catch {
    throw new HubDbError('VALIDATION_FAILED', 'Invalid sync change');
  }
}

export class HubRepository extends Credentials {
  close(): void {
    this.db.close();
  }

  private readRow(entity: Entity, id: string): Row | undefined {
    const sql =
      entity === 'item' ? 'SELECT * FROM items WHERE id = ?' : 'SELECT * FROM boards WHERE id = ?';
    return this.db.prepare(sql).get(id) as Row | undefined;
  }

  getItem(id: string, includeDeleted = false): Item | undefined {
    const row = this.readRow('item', id);
    return row && (!row.deleted_at || includeDeleted) ? itemFromRow(row) : undefined;
  }

  listItems(query: ListItemsQuery = {}): { items: Item[]; nextCursor: string | null } {
    const limit = pageSize(query.limit, 100);
    const predicates: string[] = [];
    const parameters: (string | number)[] = [];
    if (!query.includeArchived) predicates.push('archived_at IS NULL');
    if (!query.includeDeleted) predicates.push('deleted_at IS NULL');
    for (const [column, value] of [
      ['kind', query.kind],
      ['status', query.status],
      ['board_id', query.boardId],
    ]) {
      if (value && column) {
        predicates.push(`${column} = ?`);
        parameters.push(value);
      }
    }
    if (query.q?.trim()) {
      predicates.push('instr(search_text, ?) > 0');
      parameters.push(query.q.trim().toLowerCase());
    }
    if (query.tag) {
      predicates.push("EXISTS (SELECT 1 FROM json_each(items.payload, '$.tags') WHERE value = ?)");
      parameters.push(query.tag);
    }
    if (query.cursor) {
      predicates.push('(updated_at, id) < (?, ?)');
      parameters.push(...decodeCursor(query.cursor));
    }
    const where = predicates.length ? `WHERE ${predicates.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT payload FROM items ${where} ORDER BY updated_at DESC, id DESC LIMIT ?`)
      .all(...parameters, limit + 1);
    const items = rows
      .slice(0, limit)
      .map((row) => parseStoredItem(JSON.parse(String(row.payload))));
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor(last) : null };
  }

  createItem(actor: Actor, input: unknown, idempotencyKey?: string): Item {
    const draft = parseItemDraft(input);
    return transaction(this.db, () =>
      this.idempotent(actor.id, 'item.create', idempotencyKey, draft, () => {
        const now = this.now();
        const last = this.db
          .prepare('SELECT sort_key FROM items ORDER BY sort_key DESC LIMIT 1')
          .get();
        const value = parseStoredItem({
          ...draft,
          id: ulid(now.getTime()),
          source: sourceOf(actor),
          version: 1,
          order:
            draft.order ??
            orderBetween(typeof last?.sort_key === 'string' ? last.sort_key : undefined),
          status: draft.status ?? 'inbox',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
        this.writeItem(value, actor.id);
        this.writeChange('item', value.id, value.version, value);
        this.auditWrite(actor, 'item.create', value.id);
        return value;
      }),
    );
  }

  updateItem(actor: Actor, id: string, input: unknown, expectedVersion: number): Item {
    const patch = parseItemPatch(input);
    return transaction(this.db, () => {
      const row = this.readRow('item', id);
      if (!row || row.deleted_at) throw new HubDbError('NOT_FOUND', 'Item not found');
      if (row.owner_id !== actor.id && !actor.scopes?.includes('items:manage')) {
        throw new HubDbError('FORBIDDEN', 'Item belongs to another principal');
      }
      this.assertVersion(row.version, expectedVersion);
      const value = parseStoredItem({
        ...itemFromRow(row),
        ...Object.fromEntries(
          Object.entries(patch).map(([key, field]) => [key, field ?? undefined]),
        ),
        source: sourceOf(actor),
        updatedAt: this.now().toISOString(),
        version: row.version + 1,
      });
      this.writeItem(value, row.owner_id);
      this.writeChange('item', id, value.version, value);
      this.auditWrite(actor, 'item.update', id);
      return value;
    });
  }

  deleteItem(actor: Actor, id: string, expectedVersion?: number): Item {
    if (!actor.scopes?.includes('items:manage')) {
      throw new HubDbError('FORBIDDEN', 'Item deletion requires items:manage');
    }
    return transaction(this.db, () => {
      const row = this.readRow('item', id);
      if (!row) throw new HubDbError('NOT_FOUND', 'Item not found');
      if (expectedVersion !== undefined) this.assertVersion(row.version, expectedVersion);
      if (row.deleted_at) {
        this.recordAudit({
          actorId: actor.id,
          action: 'item.delete',
          entityId: id,
          outcome: 'replay',
        });
        return itemFromRow(row);
      }
      const at = this.now().toISOString();
      const item: Item = {
        ...itemFromRow(row),
        source: sourceOf(actor),
        deletedAt: at,
        updatedAt: at,
        version: row.version + 1,
      };
      this.writeItem(item, row.owner_id);
      this.writeChange('item', id, item.version, null);
      this.auditWrite(actor, 'item.delete', id);
      return item;
    });
  }

  private assertVersion(actual: number, expected: number): void {
    if (actual !== readVersion(expected, 1)) {
      throw new HubDbError('CONFLICT', 'Entity version has changed', { version: actual });
    }
  }

  private writeItem(item: Item, owner: string): void {
    const haystack = [item.title, item.body, item.url, ...item.tags]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();
    this.db
      .prepare(
        `INSERT INTO items(id,owner_id,version,kind,status,board_id,updated_at,archived_at,deleted_at,sort_key,search_text,payload)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      version=excluded.version,kind=excluded.kind,status=excluded.status,board_id=excluded.board_id,
      updated_at=excluded.updated_at,archived_at=excluded.archived_at,deleted_at=excluded.deleted_at,
      sort_key=excluded.sort_key,search_text=excluded.search_text,payload=excluded.payload`,
      )
      .run(
        item.id,
        owner,
        item.version,
        item.kind,
        item.status,
        item.boardId ?? null,
        item.updatedAt,
        item.archivedAt ?? null,
        item.deletedAt ?? null,
        item.order,
        haystack,
        JSON.stringify(item),
      );
  }

  listBoards(): Board[] {
    return this.db
      .prepare('SELECT payload FROM boards WHERE deleted_at IS NULL ORDER BY id')
      .all()
      .map(({ payload }) => parseStoredBoard(JSON.parse(String(payload))));
  }

  getBoard(id: string): Board | undefined {
    const row = this.readRow('board', id);
    return row && !row.deleted_at ? boardFromRow(row) : undefined;
  }

  createBoard(actor: Actor, input: unknown): Board {
    const draft = parseBoardDraft(input);
    return transaction(this.db, () => {
      const now = this.now();
      const board: Board = {
        columns: DEFAULT_COLUMNS,
        ...draft,
        id: ulid(now.getTime()),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.writeBoard(board, actor.id, 1);
      this.writeChange('board', board.id, 1, board);
      this.auditWrite(actor, 'board.create', board.id);
      return board;
    });
  }

  updateBoard(actor: Actor, id: string, input: unknown, expectedVersion?: number): Board {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new HubDbError('VALIDATION_FAILED', 'Invalid board patch');
    }
    return transaction(this.db, () => {
      const row = this.readRow('board', id);
      if (!row || row.deleted_at) throw new HubDbError('NOT_FOUND', 'Board not found');
      if (expectedVersion !== undefined) this.assertVersion(row.version, expectedVersion);
      const current = boardFromRow(row);
      const board = parseStoredBoard({
        ...current,
        ...input,
        id,
        createdAt: current.createdAt,
        updatedAt: this.now().toISOString(),
      });
      this.writeBoard(board, row.owner_id, row.version + 1);
      this.writeChange('board', id, row.version + 1, board);
      this.auditWrite(actor, 'board.update', id);
      return board;
    });
  }

  private writeBoard(
    board: Board,
    owner: string,
    version: number,
    deletedAt: string | null = null,
  ) {
    this.db
      .prepare(
        `INSERT INTO boards(id,owner_id,version,deleted_at,payload) VALUES (?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET version=excluded.version,deleted_at=excluded.deleted_at,payload=excluded.payload`,
      )
      .run(board.id, owner, version, deletedAt, JSON.stringify(board));
  }

  private auditWrite(actor: Actor, action: string, entityId: string): void {
    this.recordAudit({ actorId: actor.id, action, entityId, outcome: 'ok' });
  }

  private writeChange(entity: Entity, id: string, version: number, value: Value): void {
    this.db
      .prepare('INSERT INTO changes(entity,id,version,op,at,payload) VALUES (?,?,?,?,?,?)')
      .run(
        entity,
        id,
        version,
        value ? 'upsert' : 'delete',
        this.now().toISOString(),
        value ? JSON.stringify(value) : null,
      );
  }

  private idempotent<T>(
    actor: string,
    operation: string,
    key: string | undefined,
    input: object,
    perform: () => T,
  ): T {
    if (key === undefined) return perform();
    if (!/^[\x21-\x7E]{1,200}$/.test(key))
      throw new HubDbError('VALIDATION_FAILED', 'Invalid idempotency key');
    const fingerprint = digest(JSON.stringify(input));
    const stored = this.db
      .prepare(
        'SELECT fingerprint,response FROM idempotency WHERE actor_id = ? AND operation = ? AND request_key = ?',
      )
      .get(actor, operation, key);
    if (stored) {
      if (stored.fingerprint !== fingerprint)
        throw new HubDbError('CONFLICT', 'Idempotency key has already been used');
      this.recordAudit({ actorId: actor, action: operation, outcome: 'replay' });
      return JSON.parse(String(stored.response)) as T;
    }
    const value = perform();
    this.db
      .prepare('INSERT INTO idempotency VALUES (?,?,?,?,?)')
      .run(actor, operation, key, fingerprint, JSON.stringify(value));
    return value;
  }

  latestChangeSeq(): number {
    return Number(
      this.db.prepare('SELECT coalesce(max(seq), 0) AS latest FROM changes').get()?.latest,
    );
  }

  listChanges(since = 0, limit?: number): HubChangePage {
    const size = pageSize(limit, 500);
    const rows = this.db
      .prepare(
        'SELECT seq,entity,id,version,op,payload FROM changes WHERE seq > ? ORDER BY seq LIMIT ?',
      )
      .all(readVersion(since, 0), size + 1);
    const changes = rows.slice(0, size).map(({ seq, payload, ...fields }) => {
      const value: unknown = payload === null ? null : JSON.parse(String(payload));
      return { seq: Number(seq), ...parseHubSyncSnapshot({ ...fields, value }) };
    });
    return { changes, nextSince: changes.at(-1)?.seq ?? since, hasMore: rows.length > size };
  }

  pushChanges(actor: Actor, changes: readonly PushChange[]): { results: PushResult[] } {
    if (!actor.scopes?.includes('sync'))
      throw new HubDbError('FORBIDDEN', 'Synchronization scope required');
    if (!Array.isArray(changes) || !changes.length || changes.length > HUB_SYNC_BATCH)
      throw new HubDbError('VALIDATION_FAILED', 'Invalid sync batch');
    return transaction(this.db, () => ({
      results: changes.map((change: PushChange) => {
        const value = readPushValue(change);
        if (typeof change.idempotencyKey !== 'string') {
          throw new HubDbError('VALIDATION_FAILED', 'Sync change requires an idempotency key');
        }
        return this.idempotent(
          actor.id,
          'sync.push',
          change.idempotencyKey,
          { entity: change.entity, id: change.id, version: change.version, op: change.op, value },
          () => this.applyChange(actor, change, value),
        );
      }),
    }));
  }

  private applyChange(actor: Actor, change: PushChange, value: Value): PushResult {
    const { entity, id, version, idempotencyKey } = change;
    const row = this.readRow(entity, id);
    const currentVersion =
      row?.version ??
      Number(
        this.db
          .prepare(
            'SELECT version FROM changes WHERE entity = ? AND id = ? ORDER BY seq DESC LIMIT 1',
          )
          .get(entity, id)?.version ?? 0,
      );
    const current =
      row && !row.deleted_at ? (entity === 'item' ? itemFromRow(row) : boardFromRow(row)) : null;
    if (version <= currentVersion) {
      const differs = JSON.stringify(current) !== JSON.stringify(value);
      if (differs) this.saveHistory(actor, change, version, value);
      this.recordAudit({
        actorId: actor.id,
        action: 'sync.push',
        entityId: id,
        outcome: differs ? 'conflict' : 'noop',
      });
      return { idempotencyKey, applied: false, version: currentVersion, value: current };
    }
    if (currentVersion && JSON.stringify(current) !== JSON.stringify(value)) {
      this.saveHistory(actor, change, currentVersion, current);
    }
    const owner = row?.owner_id ?? actor.id;
    this.writeSyncedValue(entity, row, value, owner, version);
    this.writeChange(entity, id, version, value);
    this.auditWrite(actor, 'sync.push', id);
    return { idempotencyKey, applied: true, version, value };
  }

  private writeSyncedValue(
    entity: Entity,
    row: Row | undefined,
    value: Value,
    owner: string,
    version: number,
  ): void {
    const deletedAt = value ? null : this.now().toISOString();
    if (entity === 'item') {
      const item = value as Item | null;
      if (item) this.writeItem(item, owner);
      else if (row && deletedAt)
        this.writeItem({ ...itemFromRow(row), version, deletedAt, updatedAt: deletedAt }, owner);
    } else if (value) {
      this.writeBoard(value as Board, owner, version);
    } else if (row) {
      this.writeBoard(boardFromRow(row), owner, version, deletedAt);
    }
  }

  private saveHistory(
    actor: Actor,
    { entity, id }: PushChange,
    version: number,
    value: Value,
  ): void {
    this.db
      .prepare(
        'INSERT INTO item_history(entity,id,version,actor_id,at,payload) VALUES (?,?,?,?,?,?)',
      )
      .run(
        entity,
        id,
        version,
        actor.id,
        this.now().toISOString(),
        value ? JSON.stringify(value) : null,
      );
  }

  listHistory(
    entity: Entity,
    id: string,
    limit?: number,
  ): { version: number; at: string; value: Value }[] {
    return this.db
      .prepare(
        'SELECT version,at,payload FROM item_history WHERE entity = ? AND id = ? ORDER BY seq DESC LIMIT ?',
      )
      .all(entity, id, pageSize(limit, 100))
      .map(({ version, at, payload }) => ({
        version: Number(version),
        at: String(at),
        value:
          payload === null
            ? null
            : entity === 'item'
              ? parseStoredItem(JSON.parse(String(payload)))
              : parseStoredBoard(JSON.parse(String(payload))),
      }));
  }
}

export function openHubRepository(
  path = ':memory:',
  options: { now?: () => Date } = {},
): HubRepository {
  const db = new DatabaseSync(path, { enableDoubleQuotedStringLiterals: false });
  try {
    migrate(db);
    return new HubRepository(db, options.now ?? (() => new Date()));
  } catch (error) {
    db.close();
    throw error;
  }
}
