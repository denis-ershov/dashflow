import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeHubOrigin } from '@/core/hub/model';
import { createHubSyncEngine } from '@/core/hub/synchronize';
import { createHubSyncStore } from '@/core/items/hubSyncStore';
import { createItemRepository } from '@/core/items/repository';
import type { HubPushChange } from '../../../packages/shared/src/sync';

const actor = { type: 'user', id: 'local', name: 'Локально' } as const;
const session = { id: 'device', origin: 'http://127.0.0.1:47831', token: 'local-test-token' };
let repo: ReturnType<typeof createItemRepository>;
let sync: ReturnType<typeof createHubSyncStore>;
const notify = vi.fn();
let dbId = 0;

beforeEach(() => {
  const dbName = `hub-test-${++dbId}`;
  notify.mockReset();
  repo = createItemRepository({ dbName });
  sync = createHubSyncStore(dbName, notify);
});

afterEach(async () => {
  await Promise.all([repo.close(), sync.close()]);
});

describe('Синхронизация IndexedDB с Hub', () => {
  it('при первом подключении отправляет доски и записи, потом только изменения', async () => {
    const board = await repo.createBoard({ title: 'Новая доска' });
    const item = await repo.create({ kind: 'task', title: 'Карточка', boardId: board.id }, actor);
    expect(await sync.pending(session.id)).toBeUndefined();
    await sync.connect(session.id);
    const pending = await sync.pending(session.id);
    expect(pending?.changes.map(({ entity, id }) => [entity, id])).toEqual([
      ['board', board.id],
      ['item', item.id],
    ]);
    await sync.acknowledge(session.id, pending?.changes ?? []);
    expect((await sync.pending(session.id))?.changes).toEqual([]);
    await repo.updateBoard(board.id, { title: 'Переименована' });
    expect((await sync.pending(session.id))?.changes).toEqual([
      expect.objectContaining({ id: board.id, version: 2 }),
    ]);
  });

  it('повторяет отправку после ошибки с тем же ключом и не снимает более новую правку', async () => {
    const item = await repo.create({ kind: 'note', title: 'Исходная' }, actor);
    const pull = vi.fn(async (_session, since: number) => ({
      changes: [],
      nextSince: since,
      hasMore: false,
    }));
    const push =
      vi.fn<(conn: typeof session, outbox: readonly HubPushChange[]) => Promise<HubPushChange[]>>();
    push.mockRejectedValueOnce(new Error('Отключено'));
    let retried = false;
    push.mockImplementation(async (_conn, batch) => {
      if (!retried) {
        retried = true;
        await repo.update(item.id, { title: 'Правка во время отправки' }, actor);
      }
      return [...batch];
    });
    const run = createHubSyncEngine({ store: sync, pull, push });
    await expect(run(session)).rejects.toThrow('Отключено');
    await run(session);
    expect(push.mock.calls[1]?.[1]).toEqual(push.mock.calls[0]?.[1]);
    expect(push.mock.calls[2]?.[1]).toEqual([
      expect.objectContaining({
        value: expect.objectContaining({ title: 'Правка во время отправки' }),
        version: 2,
      }),
    ]);
    expect(await repo.get(item.id)).toMatchObject({ title: 'Правка во время отправки' });
  });

  it('сохраняет проигравшую локальную версию и двигает курсор без повторной отправки', async () => {
    const item = await repo.create({ kind: 'note', title: 'Локальная версия' }, actor);
    await sync.connect(session.id);
    await sync.applyPage(session.id, 0, {
      changes: [
        {
          entity: 'item',
          op: 'upsert',
          id: item.id,
          version: 1,
          seq: 1,
          value: { ...item, title: 'Версия Hub' },
        },
      ],
      nextSince: 1,
      hasMore: false,
    });
    expect(await repo.get(item.id)).toMatchObject({ title: 'Версия Hub' });
    expect(await sync.earlierItem(item.id)).toEqual(item);
    expect(await sync.pending(session.id)).toEqual({ since: 1, changes: [], oversized: false });
    expect(notify).toHaveBeenCalledWith({ type: 'items-changed', itemIds: [item.id] });
  });

  it('оставляет большую запись в очереди и отправляет остальные', async () => {
    await sync.connect(session.id);
    await repo.create({ kind: 'note', title: 'Большая', body: '界'.repeat(95_000) }, actor);
    const short = await repo.create({ kind: 'note', title: 'Короткая' }, actor);
    const pending = await sync.pending(session.id);
    expect(pending?.oversized).toBe(true);
    expect(pending?.changes.map(({ id }) => id)).toEqual([short.id]);
  });

  it('при отключении сохраняет локальные записи и игнорирует старый ответ', async () => {
    const item = await repo.create({ kind: 'task', title: 'Задача' }, actor);
    await sync.connect(session.id);
    await sync.disconnect(session.id);
    await sync.applyPage(session.id, 0, {
      changes: [{ entity: 'item', op: 'delete', id: item.id, version: 2, seq: 1, value: null }],
      nextSince: 1,
      hasMore: false,
    });
    expect(await sync.pending(session.id)).toBeUndefined();
    expect(await repo.get(item.id)).toEqual(item);
  });
});

it('разрешает HTTP только для loopback и отклоняет учётные данные и суффиксы в URL', () => {
  expect(normalizeHubOrigin(' http://127.0.0.1:47831/ ')).toBe('http://127.0.0.1:47831');
  expect(normalizeHubOrigin('https://hub.example.org')).toBe('https://hub.example.org');
  expect(normalizeHubOrigin('http://hub.example.org')).toBeUndefined();
  expect(normalizeHubOrigin('https://name:password@hub.example.org')).toBeUndefined();
  expect(normalizeHubOrigin('https://hub.example.org/api')).toBeUndefined();
});
