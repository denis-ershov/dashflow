import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import {
  openHubRepository,
  type Actor,
  type HubRepository,
  type PushChange,
} from '../src/db/index.js';

const alice: Actor = { id: 'alice', name: 'Alice', type: 'agent', scopes: ['items:write'] };
const bob: Actor = { id: 'bob', name: 'Bob', type: 'agent', scopes: ['items:write'] };
const manager: Actor = { ...bob, scopes: ['items:manage'] };
const device: Actor = { id: 'device', name: 'Device', type: 'user', scopes: ['sync'] };

const open: HubRepository[] = [];
const testDb = (now?: () => Date) => {
  const db = openHubRepository(':memory:', { now });
  open.push(db);
  return db;
};

afterEach(() => {
  for (const db of open.splice(0)) db.close();
});

describe('Репозиторий Hub', () => {
  it('сохраняет владельца после записи менеджером и атомарно проверяет версию', () => {
    const db = testDb();
    const initial = db.createItem(alice, { kind: 'task', title: 'Задача', body: 'Текст' });
    expect(() => db.updateItem(bob, initial.id, { title: 'Чужая' }, 1)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    const edited = db.updateItem(manager, initial.id, { title: 'Обновлена' }, 1);
    expect(edited.source.id).toBe(bob.id);
    expect(() => db.updateItem(alice, initial.id, { title: 'Старая' }, 1)).toThrowError(
      expect.objectContaining({ code: 'CONFLICT', details: { version: 2 } }),
    );
    expect(db.updateItem(alice, initial.id, { body: null }, 2).body).toBeUndefined();
    expect(() => db.deleteItem(alice, initial.id)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    expect(db.deleteItem(manager, initial.id, 3).version).toBe(4);
    expect(db.deleteItem(manager, initial.id).version).toBe(4);
    expect(db.getItem(initial.id)).toBeUndefined();
    expect(db.getItem(initial.id, true)?.deletedAt).toBeDefined();
    expect(db.listChanges().changes.map((change) => [change.op, change.version])).toEqual([
      ['upsert', 1],
      ['upsert', 2],
      ['upsert', 3],
      ['delete', 4],
    ]);
  });

  it('привязывает ключ повтора к автору и содержимому операции', () => {
    const db = testDb();
    const draft = { kind: 'task', title: 'Задача' };
    const initial = db.createItem(alice, draft, 'create-one');
    expect(db.createItem(alice, draft, 'create-one')).toEqual(initial);
    expect(() => db.createItem(alice, { ...draft, title: 'Другая' }, 'create-one')).toThrowError(
      expect.objectContaining({ code: 'CONFLICT' }),
    );
    expect(db.createItem(bob, draft, 'create-one').id).not.toBe(initial.id);
    expect(db.latestChangeSeq()).toBe(2);
  });

  it('постранично выдаёт фильтрованный список при одинаковом времени обновления', () => {
    const db = testDb(() => new Date('2026-01-01T00:00:00Z'));
    const board = db.createBoard(alice, { title: 'Доска' });
    db.updateBoard(alice, board.id, { title: 'Работа' });
    expect(db.listBoards()).toMatchObject([{ id: board.id, title: 'Работа' }]);
    const draft = { kind: 'task', boardId: board.id, status: 'todo', tags: ['входящие'] };
    const a = db.createItem(alice, { ...draft, title: 'Первый' });
    const b = db.createItem(alice, { ...draft, body: 'Первый', title: 'Второй' });
    db.createItem(alice, { ...draft, status: 'done', title: 'Первый' });
    const query = {
      kind: 'task',
      boardId: board.id,
      status: 'todo',
      tag: 'входящие',
      q: 'ПЕРВЫЙ',
      limit: 1,
    } as const;
    const first = db.listItems(query);
    expect(first.nextCursor).toBeTruthy();
    const second = db.listItems({ ...query, cursor: first.nextCursor ?? undefined });
    expect(new Set([...first.items, ...second.items].map(({ id }) => id))).toEqual(
      new Set([a.id, b.id]),
    );
    expect(second.nextCursor).toBeNull();
    expect(() => db.listItems({ cursor: 'invalid-cursor' })).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
  });

  it('двум устройствам возвращает каноническую версию и хранит проигравшие снимки', () => {
    const db = testDb();
    const base = db.createItem(alice, { kind: 'task', title: 'Начало' });
    const sync: PushChange = {
      entity: 'item',
      op: 'upsert',
      id: base.id,
      version: 2,
      idempotencyKey: 'push-one',
      value: { ...base, title: 'Первая правка', version: 2 },
    };
    expect(db.pushChanges(device, [sync]).results[0]).toMatchObject({ applied: true, version: 2 });
    const alternate = { ...device, id: 'another-device' };
    const conflict = { ...sync, value: { ...base, title: 'Другая правка', version: 2 } };
    const lost = db.pushChanges(alternate, [conflict]);
    expect(lost.results[0]).toMatchObject({
      applied: false,
      value: { title: 'Первая правка' },
      version: 2,
    });
    expect(db.pushChanges(alternate, [conflict])).toEqual(lost);
    expect(db.listHistory('item', base.id)).toMatchObject([
      { version: 2, value: { title: 'Другая правка' } },
      { version: 1, value: { title: 'Начало' } },
    ]);
    expect(
      db.pushChanges(device, [
        { ...sync, op: 'delete', value: null, version: 3, idempotencyKey: 'remove' },
      ]).results[0],
    ).toMatchObject({ applied: true, value: null });
    const first = db.listChanges(0, 2);
    expect(first).toMatchObject({ nextSince: 2, hasMore: true });
    expect(db.listChanges(first.nextSince, 2)).toMatchObject({
      nextSince: 3,
      hasMore: false,
      changes: [{ op: 'delete', version: 3, value: null }],
    });
    expect(db.getItem(base.id, true)?.version).toBe(3);
  });

  it('откатывает весь пакет при ошибке и сохраняет tombstone без исходной записи', () => {
    const db = testDb();
    const tombstone: PushChange = {
      entity: 'item',
      op: 'delete',
      id: 'offline-id',
      version: 2,
      value: null,
      idempotencyKey: 'remove',
    };
    expect(() => db.pushChanges(device, [tombstone, { ...tombstone, version: 0 }])).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(db.latestChangeSeq()).toBe(0);
    expect(db.pushChanges(device, [tombstone]).results[0]?.applied).toBe(true);
    expect(
      db.pushChanges(device, [{ ...tombstone, version: 1, idempotencyKey: 'old' }]).results[0],
    ).toMatchObject({ applied: false, version: 2, value: null });
  });

  it('повторно открывает мигрированную базу и записывает аудит без содержимого Item', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dashflow-hub-db-'));
    try {
      const path = join(dir, 'hub.sqlite');
      const db = openHubRepository(path);
      const item = db.createItem(alice, { kind: 'note', title: 'Синтетический документ' });
      db.close();
      const reopened = openHubRepository(path);
      expect(reopened.getItem(item.id)).toEqual(item);
      reopened.close();
      const inspection = new DatabaseSync(path);
      expect(
        inspection.prepare('SELECT actor_id,action,entity_id,outcome FROM audit').all(),
      ).toMatchObject([
        { actor_id: alice.id, action: 'item.create', entity_id: item.id, outcome: 'ok' },
      ]);
      inspection.close();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('Учётные данные Hub', () => {
  it('учитывает scopes, время обращения, срок действия и отзыв токена', () => {
    let time = new Date('2026-01-01T00:00:00Z');
    const db = testDb(() => time);
    const issued = db.createToken('Agent', ['items:write', 'items:write'], '2026-01-01T00:01:00Z');
    const unlimited = db.createToken('Other', ['items:read']);
    expect(db.authenticateToken(issued.token)).toMatchObject({
      id: issued.record.id,
      scopes: ['items:write'],
      lastUsedAt: time.toISOString(),
    });
    expect(db.listTokens().every((record) => !('token' in record) && !('hash' in record))).toBe(
      true,
    );
    time = new Date('2026-01-01T00:01:00Z');
    expect(db.authenticateToken(issued.token)).toBeUndefined();
    expect(db.isTokenActive(issued.record.id)).toBe(false);
    expect(db.revokeToken(unlimited.record.id)).toBe(true);
    expect(db.authenticateToken(unlimited.token)).toBeUndefined();
  });

  it('проверяет origin и выдаёт токен синхронизации один раз', () => {
    let time = new Date('2026-01-01T00:00:00Z');
    const db = testDb(() => time);
    const origin = 'chrome-extension://abcdefgh';
    const challenge = db.createPairingChallenge(origin);
    expect(challenge.code).toMatch(/^\d{6}$/);
    expect(db.consumePairingChallenge(challenge.code, 'Wrong origin')).toBeUndefined();
    const paired = db.consumePairingChallenge(challenge.code, 'Device', origin);
    expect(paired?.record.scopes).toEqual(['sync']);
    expect(db.consumePairingChallenge(challenge.code, 'Second attempt', origin)).toBeUndefined();
    const expired = db.createPairingChallenge();
    time = new Date(expired.expiresAt);
    expect(db.consumePairingChallenge(expired.code, 'Expired')).toBeUndefined();
  });

  it('находит вебхук по токену пути и прекращает принимать его после отзыва', () => {
    const db = testDb();
    const webhook = db.createWebhook('External source');
    expect(db.getWebhook(webhook.token)).toEqual({
      id: webhook.record.id,
      name: 'External source',
      key: webhook.secret,
    });
    expect(db.getWebhook(webhook.secret)).toBeUndefined();
    expect(db.revokeWebhook(webhook.record.id)).toBe(true);
    expect(db.getWebhook(webhook.token)).toBeUndefined();
  });
});
