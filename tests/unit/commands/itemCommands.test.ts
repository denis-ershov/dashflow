import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ITEM_COMMANDS,
  UndoConflictError,
  createDispatcher,
  type Dispatcher,
} from '@/core/commands';
import {
  ItemValidationError,
  createItemRepository,
  type Board,
  type Item,
  type ItemRepository,
  type ItemSource,
} from '@/core/items';

const user: ItemSource = { type: 'user', id: 'local', name: 'local' };
const agent: ItemSource = { type: 'agent', id: 'hermes', name: 'Hermes' };

let repo: ItemRepository;
let bus: Dispatcher;
let counter = 0;

beforeEach(() => {
  repo = createItemRepository({ dbName: `commands-${++counter}` });
  bus = createDispatcher({ context: { repository: repo, source: user }, commands: ITEM_COMMANDS });
});

afterEach(async () => {
  await repo.close();
});

const create = async (draft: Record<string, unknown>) =>
  (await bus.dispatch<Item>('item.create', draft)).result;

describe('Команды Item', () => {
  it('создание отменяется удалением в корзину', async () => {
    const item = await create({ kind: 'task', title: 'Купить хлеб' });
    expect(item.source).toEqual(user);

    await bus.undo();
    expect((await repo.get(item.id))?.deletedAt).toBeDefined();
    expect(await repo.query()).toEqual([]);
  });

  it('изменение отменяется к прежним значениям, включая очищенные поля', async () => {
    const item = await create({ kind: 'task', title: 'Отчёт', dueAt: '2026-11-01T09:00:00Z' });
    await bus.dispatch('item.update', {
      id: item.id,
      patch: { title: 'Отчёт за октябрь', dueAt: null, priority: 'high' },
    });

    await bus.undo();
    const restored = await repo.get(item.id);
    expect(restored).toMatchObject({ title: 'Отчёт', dueAt: '2026-11-01T09:00:00.000Z' });
    expect(restored?.priority).toBeUndefined();
  });

  it('отмена не затирает правку, сделанную после команды', async () => {
    const item = await create({ kind: 'task', title: 'A' });
    await bus.dispatch('item.update', { id: item.id, patch: { title: 'B' } });
    await repo.update(item.id, { title: 'C от агента' }, agent);

    await expect(bus.undo()).rejects.toBeInstanceOf(UndoConflictError);
    expect((await repo.get(item.id))?.title).toBe('C от агента');
  });

  it('перемещение ставит запись между соседями и отменяется', async () => {
    const a = await create({ kind: 'card', title: 'a', status: 'todo', boardId: 'b1' });
    const b = await create({ kind: 'card', title: 'b', status: 'todo', boardId: 'b1' });
    const c = await create({ kind: 'card', title: 'c', status: 'doing', boardId: 'b1' });

    await bus.dispatch('item.move', { id: c.id, status: 'todo', afterId: a.id, beforeId: b.id });
    const titles = (await repo.query({ boardId: 'b1', status: 'todo' })).map((i) => i.title);
    expect(titles).toEqual(['a', 'c', 'b']);

    await bus.undo();
    const back = await repo.get(c.id);
    expect(back).toMatchObject({ status: 'doing', order: c.order });
  });

  it('выполнение, отложение и архив отменяются', async () => {
    const item = await create({ kind: 'task', title: 'x', status: 'doing' });

    await bus.dispatch('item.complete', { id: item.id, done: true });
    expect((await repo.get(item.id))?.status).toBe('done');
    await bus.undo();
    expect((await repo.get(item.id))?.status).toBe('doing');

    await bus.dispatch('item.snooze', { id: item.id, until: '2026-11-02T08:00:00+03:00' });
    expect((await repo.get(item.id))?.remindAt).toBe('2026-11-02T05:00:00.000Z');
    await bus.undo();
    expect((await repo.get(item.id))?.remindAt).toBeUndefined();

    await bus.dispatch('item.archive', { id: item.id });
    expect(await repo.query()).toEqual([]);
    await bus.undo();
    expect(await repo.query()).toHaveLength(1);
  });

  it('удаление и восстановление отменяют друг друга', async () => {
    const item = await create({ kind: 'note', title: 'Заметка' });
    await bus.dispatch('item.delete', { id: item.id });
    expect(await repo.query()).toEqual([]);
    await bus.undo();
    expect(await repo.query()).toHaveLength(1);

    await repo.remove(item.id, user);
    await bus.dispatch('item.restore', { id: item.id });
    await bus.undo();
    expect((await repo.get(item.id))?.deletedAt).toBeDefined();
  });

  it('пустое изменение не попадает в историю', async () => {
    const item = await create({ kind: 'task', title: 'x' });
    await bus.undo(); // убираем создание из истории
    await repo.restore(item.id, user);
    await bus.dispatch('item.update', { id: item.id, patch: { title: 'x' } });
    expect(bus.canUndo()).toBe(false);
  });

  it('отвергает невалидный вход', async () => {
    await expect(bus.dispatch('item.create', { kind: 'task' })).rejects.toBeInstanceOf(
      ItemValidationError,
    );
    await expect(bus.dispatch('item.update', { id: '../x', patch: {} })).rejects.toBeInstanceOf(
      ItemValidationError,
    );
    await expect(bus.dispatch('item.complete', { id: 'abc', done: 'yes' })).rejects.toBeInstanceOf(
      ItemValidationError,
    );
    await expect(
      bus.dispatch('item.snooze', { id: 'abc', until: 'завтра' }),
    ).rejects.toBeInstanceOf(ItemValidationError);
  });
});

describe('Команды досок', () => {
  it('создание доски отменяется архивацией, изменение — прежними значениями', async () => {
    const { result: board } = await bus.dispatch<Board>('board.create', { title: 'Работа' });
    await bus.dispatch('board.update', { id: board.id, draft: { title: 'Проекты' } });
    expect((await repo.getBoard(board.id))?.title).toBe('Проекты');

    await bus.undo();
    expect((await repo.getBoard(board.id))?.title).toBe('Работа');
    await bus.undo();
    expect(await repo.listBoards()).toEqual([]);
  });
});
