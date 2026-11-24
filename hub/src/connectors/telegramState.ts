import { constants, closeSync, fchmodSync, lstatSync, openSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { ConnectorError } from './contract.js';

export function openTelegramState(path: string, botId: string) {
  let db: DatabaseSync | undefined;
  try {
    const info = lstatSync(path, { throwIfNoEntry: false });
    if (info && !info.isFile()) throw new ConnectorError('STORAGE');
    const handle = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    try {
      if (process.platform !== 'win32') fchmodSync(handle, 0o600);
    } finally {
      closeSync(handle);
    }
    db = new DatabaseSync(path);
    db.exec(`
      PRAGMA busy_timeout = 1000;
      CREATE TABLE IF NOT EXISTS telegram_state (
        bot_id TEXT PRIMARY KEY,
        offset INTEGER NOT NULL DEFAULT 0,
        last_update_ms INTEGER NOT NULL DEFAULT 0,
        reminder_cursor TEXT
      ) STRICT;
      CREATE TABLE IF NOT EXISTS telegram_deliveries (
        bot_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        remind_ms INTEGER NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('attempted', 'sent', 'failed')),
        PRIMARY KEY (bot_id, item_id, remind_ms)
      ) STRICT;
    `);
    db.prepare('INSERT OR IGNORE INTO telegram_state (bot_id) VALUES (?)').run(botId);
  } catch {
    db?.close();
    throw new ConnectorError('STORAGE');
  }
  const sqlite = db;
  return {
    checkpoint() {
      const row = sqlite
        .prepare(
          'SELECT offset, last_update_ms, reminder_cursor FROM telegram_state WHERE bot_id = ?',
        )
        .get(botId);
      if (
        !row ||
        typeof row.offset !== 'number' ||
        typeof row.last_update_ms !== 'number' ||
        !(row.reminder_cursor === null || typeof row.reminder_cursor === 'string')
      ) {
        throw new ConnectorError('STORAGE');
      }
      return { offset: row.offset, lastUpdateAt: row.last_update_ms, cursor: row.reminder_cursor };
    },
    recordUpdates(offset: number, receivedAt: number) {
      sqlite
        .prepare('UPDATE telegram_state SET offset = ?, last_update_ms = ? WHERE bot_id = ?')
        .run(offset, receivedAt, botId);
    },
    recordCursor(cursor: string | null) {
      sqlite
        .prepare('UPDATE telegram_state SET reminder_cursor = ? WHERE bot_id = ?')
        .run(cursor, botId);
    },
    claim(itemId: string, remindAt: number) {
      return (
        sqlite
          .prepare(
            `INSERT OR IGNORE INTO telegram_deliveries (bot_id, item_id, remind_ms, state)
           VALUES (?, ?, ?, 'attempted')`,
          )
          .run(botId, itemId, remindAt).changes === 1
      );
    },
    settle(itemId: string, remindAt: number, state: 'sent' | 'failed' | 'retry') {
      if (state === 'retry') {
        sqlite
          .prepare(
            'DELETE FROM telegram_deliveries WHERE bot_id = ? AND item_id = ? AND remind_ms = ?',
          )
          .run(botId, itemId, remindAt);
      } else {
        sqlite
          .prepare(
            'UPDATE telegram_deliveries SET state = ? WHERE bot_id = ? AND item_id = ? AND remind_ms = ?',
          )
          .run(state, botId, itemId, remindAt);
      }
    },
    prune(before: number) {
      sqlite
        .prepare('DELETE FROM telegram_deliveries WHERE bot_id = ? AND remind_ms < ?')
        .run(botId, before);
    },
    close() {
      sqlite.close();
    },
  };
}

export type TelegramState = ReturnType<typeof openTelegramState>;
