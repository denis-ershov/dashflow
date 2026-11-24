import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { openHubRepository, type Actor, type HubRepository } from '../src/db/index.js';

const owner: Actor = { id: 'owner', name: 'Owner', type: 'user', scopes: ['sync'] };
const START = '2026-11-24T08:00:00.000Z';
const open: HubRepository[] = [];

function testDb() {
  let time = new Date(START);
  const db = openHubRepository(':memory:', { now: () => time });
  open.push(db);
  const advance = () => {
    time = new Date(time.getTime() + 1_000);
  };
  return { db, advance };
}

function tokenAgent(db: HubRepository, scopes = ['items:read', 'items:write']) {
  const credential = db.createToken('Agent', scopes);
  const actor: Actor = {
    id: credential.record.id,
    name: credential.record.name,
    type: 'agent',
    scopes: credential.record.scopes,
  };
  const assignee = `agent:${actor.id}` as const;
  return { actor, assignee, token: credential.token };
}

afterEach(() => {
  for (const db of open.splice(0)) db.close();
});

describe('Задачи агентам', () => {
  it('отделяет права назначения и ответ агента от прав владельца', () => {
    const { db } = testDb();
    const { actor, assignee } = tokenAgent(db);
    const other = tokenAgent(db).actor;
    const draft = { kind: 'task', title: 'Задача', body: 'Цель', assignee, status: 'todo' };
    expect(() => db.createItem(actor, draft)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    const task = db.createItem(owner, draft);
    expect(db.listItems({ assignee }).items).toEqual([task]);
    expect(db.listItems({ sourceId: owner.id }).items).toEqual([task]);
    expect(() => db.updateItem(other, task.id, { status: 'doing' }, 1)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    for (const patch of [
      { title: 'Подмена' },
      { boardId: 'elsewhere' },
      { status: 'inbox' },
      { assignee: null },
    ]) {
      expect(() => db.updateItem(actor, task.id, patch, 1)).toThrowError(
        expect.objectContaining({ code: 'FORBIDDEN' }),
      );
    }
    const reply = db.updateItem(actor, task.id, { status: 'doing', agentComment: 'Проверяю' }, 1);
    expect(reply).toMatchObject({
      title: draft.title,
      body: draft.body,
      agentComment: 'Проверяю',
      status: 'doing',
      assignee,
    });
    expect(db.listItems({ assignee, sourceId: actor.id }).items).toEqual([reply]);
    const reassigned = db.updateItem(owner, task.id, { assignee: null }, 2);
    expect(reassigned.assignee).toBeUndefined();
    expect(db.listItems({ assignee }).items).toEqual([]);
  });

  it('отклоняет недействительные назначения из REST и sync, включая отозванные токены', () => {
    const { db } = testDb();
    const { actor, assignee, token } = tokenAgent(db);
    const reader = tokenAgent(db, ['items:read']);
    const initial = db.createItem(owner, { kind: 'task', title: 'Задача' });
    const sync = (target: string) =>
      db.pushChanges(owner, [
        {
          entity: 'item',
          op: 'upsert',
          id: initial.id,
          version: 2,
          idempotencyKey: `assign-${target}`,
          value: { ...initial, version: 2, assignee: target },
        },
      ]);
    expect(() => db.createItem(owner, { kind: 'note', title: 'Заметка', assignee })).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(() => sync(reader.assignee)).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(sync(assignee).results[0]?.value).toMatchObject({ assignee });
    expect(db.revokeAgent(owner, actor.id).revokedAt).toBeDefined();
    expect(db.authenticateToken(token)).toBeUndefined();
    expect(() => db.updateItem(actor, initial.id, { status: 'done' }, 2)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    const other = db.createItem(owner, { kind: 'task', title: 'Другая' });
    expect(() => db.updateItem(owner, other.id, { assignee }, 1)).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(db.updateItem(owner, initial.id, { title: 'Приоритет' }, 2).assignee).toBe(assignee);
  });

  it('возвращает метаданные и число созданных записей только управляющему', () => {
    const { db } = testDb();
    const { actor, token } = tokenAgent(db);
    const reader = tokenAgent(db, ['digests:write']);
    db.createToken('Device', ['sync']);
    db.authenticateToken(token);
    const item = db.createItem(actor, { kind: 'task', title: 'Создано агентом' });
    const manager: Actor = { ...owner, scopes: ['items:manage'] };
    db.deleteItem(manager, item.id);
    expect(() => db.listAgents(actor)).toThrowError(expect.objectContaining({ code: 'FORBIDDEN' }));
    expect(db.listAgents(owner)).toHaveLength(2);
    expect(db.listAgents(owner)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: actor.id, createdItems: 1, lastUsedAt: START }),
        expect.objectContaining({ id: reader.actor.id, createdItems: 0 }),
      ]),
    );
    expect(db.listAgents(owner).every((entry) => !('hash' in entry) && !('token' in entry))).toBe(
      true,
    );
  });
});

describe('Отмена записей агента', () => {
  it('откатывает правки и создание с версионным журналом, пропускает последующую правку владельца', () => {
    const { db, advance } = testDb();
    const { actor, assignee } = tokenAgent(db);
    const assigned = db.createItem(owner, {
      kind: 'task',
      title: 'Исходная',
      assignee,
      status: 'todo',
    });
    advance();
    const baseVersion = db.latestChangeSeq();
    db.updateItem(actor, assigned.id, { status: 'doing', agentComment: 'В работе' }, 1);
    db.updateItem(actor, assigned.id, { status: 'done' }, 2);
    const created = db.createItem(actor, { kind: 'task', title: 'Создано агентом' });
    const skipped = db.createItem(actor, { kind: 'task', title: 'Сохранить' });
    db.updateItem(owner, skipped.id, { body: 'Авторская правка' }, 1);

    const preview = db.previewAgentRollback(owner, actor.id, { since: START });
    expect(preview).toMatchObject({ matched: 4, eligible: 3, skipped: 1 });
    expect(db.getItem(assigned.id)?.status).toBe('done');
    expect(db.rollbackAgent(owner, actor.id, preview)).toMatchObject({ reverted: 3, skipped: 1 });
    expect(db.getItem(assigned.id)).toMatchObject({
      version: 4,
      status: 'todo',
      source: { id: owner.id },
    });
    expect(db.getItem(assigned.id)?.agentComment).toBeUndefined();
    expect(db.getItem(created.id)).toBeUndefined();
    expect(db.getItem(created.id, true)?.deletedAt).toBeDefined();
    expect(db.getItem(skipped.id)?.body).toBe('Авторская правка');
    const changes = db.listChanges(baseVersion).changes;
    expect(changes.slice(-2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: assigned.id, op: 'upsert', version: 4 }),
        expect.objectContaining({ id: created.id, op: 'delete', version: 2, value: null }),
      ]),
    );
  });

  it('сохраняет промежуточную правку и отклоняет устаревший план атомарно', () => {
    const { db, advance } = testDb();
    const { actor, assignee } = tokenAgent(db);
    const task = db.createItem(owner, {
      kind: 'task',
      title: 'Исходная',
      status: 'todo',
      assignee,
    });
    db.updateItem(actor, task.id, { status: 'doing' }, 1);
    db.updateItem(owner, task.id, { body: 'Между изменениями' }, 2);
    db.updateItem(actor, task.id, { status: 'done' }, 3);
    const created = db.createItem(actor, { kind: 'task', title: 'Создано агентом' });
    const preview = db.previewAgentRollback(owner, actor.id, { since: START });
    expect(preview).toMatchObject({ matched: 3, eligible: 2, skipped: 1 });
    advance();
    db.updateItem(owner, created.id, { body: 'Правка после предпросмотра' }, 1);
    expect(() => db.rollbackAgent(owner, actor.id, preview)).toThrowError(
      expect.objectContaining({ code: 'CONFLICT' }),
    );
    expect(db.getItem(task.id)?.status).toBe('done');
    const newPreview = db.previewAgentRollback(owner, actor.id, { since: START });
    expect(db.rollbackAgent(owner, actor.id, newPreview)).toMatchObject({
      reverted: 1,
      skipped: 2,
    });
    expect(db.getItem(task.id)).toMatchObject({ status: 'doing', body: 'Между изменениями' });
  });

  it('сохраняет прежние данные при миграции SQLite и исключает записи v1 без автора из отката', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dashflow-hub-agents-'));
    const path = join(dir, 'hub.sqlite');
    try {
      const before = openHubRepository(path, { now: () => new Date(START) });
      const { actor } = tokenAgent(before);
      const created = before.createItem(actor, { kind: 'task', title: 'Запись схемы v1' });
      before.close();

      const fixture = new DatabaseSync(path);
      fixture.exec(`
        DROP INDEX items_assignee_page;
        DROP INDEX items_source_page;
        DROP INDEX items_owner;
        DROP INDEX changes_actor_date;
        ALTER TABLE items DROP COLUMN assignee;
        ALTER TABLE items DROP COLUMN source_id;
        ALTER TABLE changes DROP COLUMN actor_id;
        ALTER TABLE changes DROP COLUMN before_payload;
        ALTER TABLE changes DROP COLUMN before_deleted;
        PRAGMA user_version = 1;
      `);
      fixture.close();

      const reopened = openHubRepository(path, { now: () => new Date(START) });
      try {
        expect(reopened.listItems({ sourceId: actor.id }).items).toEqual([created]);
        expect(reopened.listAgents(owner)[0]).toMatchObject({ id: actor.id, createdItems: 1 });
        expect(reopened.listChanges().changes[0]).toMatchObject({ id: created.id, version: 1 });
        expect(reopened.previewAgentRollback(owner, actor.id, { since: START })).toMatchObject({
          matched: 0,
        });
        reopened.updateItem(actor, created.id, { title: 'Правка схемы v2' }, 1);
        const preview = reopened.previewAgentRollback(owner, actor.id, { since: START });
        expect(preview).toMatchObject({ matched: 1, eligible: 1 });
        reopened.rollbackAgent(owner, actor.id, preview);
        expect(reopened.getItem(created.id)?.title).toBe(created.title);
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
