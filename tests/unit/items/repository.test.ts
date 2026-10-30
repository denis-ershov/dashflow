import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CHANGES_RETENTION,
  ItemConflictError,
  ItemNotFoundError,
  createItemRepository,
  type ItemRepository,
} from '@/core/items/repository';
import { ItemValidationError } from '@/core/items/validation';
import type { ItemSource } from '@/core/items/types';

const user: ItemSource = { type: 'user', id: 'local', name: 'Вы' };
const agent: ItemSource = { type: 'agent', id: 'hermes', name: 'Hermes' };

let repo: ItemRepository;
let clock: Date;
const notify = vi.fn();
let dbCounter = 0;

beforeEach(() => {
  clock = new Date('2026-10-30T10:00:00.000Z');
  notify.mockReset();
  repo = createItemRepository({
    dbName: `items-test-${++dbCounter}`,
    now: () => clock,
    notify,
  });
});

afterEach(async () => {
  await repo.close();
});

const tick = (ms = 1000) => {
  clock = new Date(clock.getTime() + ms);
};

describe('Репозиторий Item: создание и чтение', () => {
  it('создаёт запись со служебными полями и журналом', async () => {
    const item = await repo.create({ kind: 'task', title: 'Позвонить' }, user);

    expect(item).toMatchObject({
      kind: 'task',
      title: 'Позвонить',
      status: 'inbox',
      tags: [],
      version: 1,
      source: user,
      createdAt: '2026-10-30T10:00:00.000Z',
    });
    expect(await repo.get(item.id)).toEqual(item);
    expect(await repo.listChanges()).toEqual([
      expect.objectContaining({ seq: 1, itemId: item.id, op: 'create', version: 1, source: user }),
    ]);
    expect(notify).toHaveBeenCalledWith({ type: 'items-changed', itemIds: [item.id] });
  });

  it('новая запись встаёт в конец своей группы', async () => {
    const first = await repo.create(
      { kind: 'task', title: '1', status: 'todo', boardId: 'b1' },
      user,
    );
    const second = await repo.create(
      { kind: 'task', title: '2', status: 'todo', boardId: 'b1' },
      user,
    );
    const other = await repo.create(
      { kind: 'task', title: 'x', status: 'todo', boardId: 'b2' },
      user,
    );

    expect(first.order < second.order).toBe(true);
    expect(other.order).toBe(first.order);
  });

  it('отвергает невалидный черновик и ничего не пишет', async () => {
    await expect(
      repo.create({ kind: 'link', title: 'x', url: 'javascript:alert(1)' }, user),
    ).rejects.toBeInstanceOf(ItemValidationError);
    expect(await repo.query()).toEqual([]);
    expect(await repo.listChanges()).toEqual([]);
  });
});

describe('Репозиторий Item: изменение', () => {
  it('меняет поля, растит версию, null очищает поле', async () => {
    const item = await repo.create(
      { kind: 'task', title: 'Отчёт', dueAt: '2026-11-01T09:00:00Z', priority: 'high' },
      user,
    );
    tick();
    const updated = await repo.update(item.id, { title: 'Отчёт за октябрь', dueAt: null }, agent);

    expect(updated).toMatchObject({ title: 'Отчёт за октябрь', priority: 'high', version: 2 });
    expect(updated.dueAt).toBeUndefined();
    expect(updated.updatedAt).toBe('2026-10-30T10:00:01.000Z');
    expect(updated.source).toEqual(user); // источник создания не переписывается
    expect((await repo.listChanges()).at(-1)).toMatchObject({ op: 'update', source: agent });
  });

  it('пустое изменение не создаёт новую версию', async () => {
    const item = await repo.create({ kind: 'note', title: 'Заметка' }, user);
    expect(await repo.update(item.id, {}, user)).toEqual(item);
    expect(await repo.listChanges()).toHaveLength(1);
  });

  it('конфликт версий возвращает актуальную запись', async () => {
    const item = await repo.create({ kind: 'task', title: 'A' }, user);
    await repo.update(item.id, { title: 'B' }, user);

    const error = await repo.update(item.id, { title: 'C' }, agent, 1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ItemConflictError);
    expect((error as ItemConflictError).current.title).toBe('B');
  });

  it('несуществующая и удалённая запись — ItemNotFoundError', async () => {
    await expect(repo.update('nope', { title: 'x' }, user)).rejects.toBeInstanceOf(
      ItemNotFoundError,
    );
    const item = await repo.create({ kind: 'task', title: 'x' }, user);
    await repo.remove(item.id, user);
    await expect(repo.update(item.id, { title: 'y' }, user)).rejects.toBeInstanceOf(
      ItemNotFoundError,
    );
  });
});

describe('Репозиторий Item: корзина', () => {
  it('удаление мягкое, restore возвращает запись', async () => {
    const item = await repo.create({ kind: 'task', title: 'x' }, user);
    const removed = await repo.remove(item.id, user);

    expect(removed.deletedAt).toBe(clock.toISOString());
    expect(await repo.query()).toEqual([]);
    expect(await repo.query({ onlyDeleted: true })).toHaveLength(1);

    const restored = await repo.restore(item.id, user);
    expect(restored.deletedAt).toBeUndefined();
    expect(restored.version).toBe(3);
    expect(await repo.query()).toHaveLength(1);
  });

  it('очистка удаляет только записи старше срока', async () => {
    const old = await repo.create({ kind: 'task', title: 'old' }, user);
    await repo.remove(old.id, user);
    tick(20 * 24 * 3600 * 1000);
    const fresh = await repo.create({ kind: 'task', title: 'fresh' }, user);
    await repo.remove(fresh.id, user);
    tick(11 * 24 * 3600 * 1000);

    expect(await repo.purgeDeleted(user)).toBe(1);
    expect(await repo.get(old.id)).toBeUndefined();
    expect(await repo.get(fresh.id)).toBeDefined();
    expect((await repo.listChanges()).at(-1)).toMatchObject({ op: 'purge', itemId: old.id });
  });
});

describe('Репозиторий Item: запросы', () => {
  beforeEach(async () => {
    await repo.create({ kind: 'task', title: 'a', status: 'todo', tags: ['дом'] }, user);
    tick();
    await repo.create({ kind: 'task', title: 'b', status: 'done' }, user);
    tick();
    await repo.create({ kind: 'note', title: 'c', boardId: 'b1' }, user);
    tick();
    const archived = await repo.create({ kind: 'task', title: 'd', status: 'todo' }, user);
    await repo.update(archived.id, { archivedAt: clock.toISOString() }, user);
  });

  it('фильтрует по виду, статусу, доске и тегу', async () => {
    const titles = async (q: Parameters<ItemRepository['query']>[0]) =>
      (await repo.query(q)).map((item) => item.title);

    expect(await titles({ kind: 'task' })).toEqual(['a', 'b']);
    expect(await titles({ kind: ['task', 'note'], status: 'todo' })).toEqual(['a']);
    expect(await titles({ boardId: 'b1' })).toEqual(['c']);
    expect(await titles({ tag: 'дом' })).toEqual(['a']);
    expect(await titles({ kind: 'task', includeArchived: true })).toContain('d');
  });

  it('сортирует по дате изменения и ограничивает количество', async () => {
    const latest = await repo.query({ sort: 'updatedAt', limit: 2 });
    expect(latest.map((item) => item.title)).toEqual(['c', 'b']);
  });
});

describe('Репозиторий Item: журнал и доски', () => {
  it('журнал отдаётся после seq и обрезается до лимита', async () => {
    const item = await repo.create({ kind: 'task', title: 'x' }, user);
    for (let i = 0; i < 5; i++) await repo.update(item.id, { title: `x${i}` }, user);

    const afterThird = await repo.listChanges(3);
    expect(afterThird.map((change) => change.seq)).toEqual([4, 5, 6]);
    expect(CHANGES_RETENTION).toBeGreaterThan(1000);
  });

  it('создаёт доску с колонками по умолчанию, меняет и скрывает архивные', async () => {
    const board = await repo.createBoard({ title: 'Работа' });
    expect(board.columns.map((c) => c.id)).toEqual(['todo', 'doing', 'done']);

    const renamed = await repo.updateBoard(board.id, { title: 'Проекты' });
    expect(renamed.title).toBe('Проекты');
    expect(await repo.listBoards()).toHaveLength(1);
    expect(notify).toHaveBeenCalledWith({ type: 'items-changed', itemIds: [], boards: true });
  });
});
