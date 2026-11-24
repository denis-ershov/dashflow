import type { DatabaseSync } from 'node:sqlite';

export function transaction<T>(db: DatabaseSync, action: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = action();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function migrate(db: DatabaseSync): void {
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
  transaction(db, () => {
    const version = db.prepare('PRAGMA user_version').get()?.user_version;
    if (version === 1) return;
    if (version !== 0) throw new Error('Unsupported Hub database version');
    db.exec(`
      CREATE TABLE items (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, version INTEGER NOT NULL,
        kind TEXT NOT NULL, status TEXT NOT NULL, board_id TEXT, updated_at TEXT NOT NULL,
        archived_at TEXT, deleted_at TEXT, sort_key TEXT NOT NULL, search_text TEXT NOT NULL,
        payload TEXT NOT NULL CHECK (json_valid(payload))
      ) STRICT;
      CREATE INDEX items_page ON items(updated_at DESC, id DESC);
      CREATE INDEX items_board_page ON items(board_id, updated_at DESC, id DESC);
      CREATE INDEX items_order ON items(sort_key DESC);

      CREATE TABLE boards (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, version INTEGER NOT NULL,
        deleted_at TEXT, payload TEXT NOT NULL CHECK (json_valid(payload))
      ) STRICT;
      CREATE TABLE changes (
        seq INTEGER PRIMARY KEY, entity TEXT NOT NULL CHECK (entity IN ('item','board')),
        id TEXT NOT NULL, version INTEGER NOT NULL, op TEXT NOT NULL CHECK (op IN ('upsert','delete')),
        at TEXT NOT NULL, payload TEXT CHECK (json_valid(payload))
      ) STRICT;
      CREATE INDEX entity_changes ON changes(entity, id, seq DESC);
      CREATE TABLE item_history (
        seq INTEGER PRIMARY KEY, entity TEXT NOT NULL, id TEXT NOT NULL, version INTEGER NOT NULL,
        actor_id TEXT NOT NULL, at TEXT NOT NULL, payload TEXT CHECK (json_valid(payload))
      ) STRICT;
      CREATE INDEX item_history_by_entity ON item_history(entity, id, seq DESC);
      CREATE TABLE idempotency (
        actor_id TEXT NOT NULL, operation TEXT NOT NULL, request_key TEXT NOT NULL,
        fingerprint TEXT NOT NULL, response TEXT NOT NULL CHECK (json_valid(response)),
        PRIMARY KEY (actor_id, operation, request_key)
      ) STRICT;
      CREATE TABLE tokens (
        id TEXT PRIMARY KEY, hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL, scopes TEXT NOT NULL,
        created_at TEXT NOT NULL, expires_at TEXT, revoked_at TEXT, last_used_at TEXT
      ) STRICT;
      CREATE TABLE audit (
        seq INTEGER PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
        entity_id TEXT, outcome TEXT NOT NULL, at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE webhooks (
        id TEXT PRIMARY KEY, hash TEXT NOT NULL UNIQUE, signing_key TEXT NOT NULL,
        name TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT
      ) STRICT;
      CREATE TABLE pairing_challenges (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1), hash TEXT NOT NULL,
        salt TEXT NOT NULL, origin TEXT, expires_at TEXT NOT NULL, failed_attempts INTEGER NOT NULL
      ) STRICT;
      PRAGMA user_version = 1;
    `);
  });
}
