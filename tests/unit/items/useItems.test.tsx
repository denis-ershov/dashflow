import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createItemRepository } from '@/core/items/repository';
import { publishItemsChanged, subscribeItemsChanged } from '@/core/items/events';
import { useItems } from '@/core/items/useItems';
import type { ItemSource } from '@/core/items/types';

const user: ItemSource = { type: 'user', id: 'local', name: 'Вы' };
let counter = 0;
const makeRepo = () =>
  createItemRepository({ dbName: `use-items-${++counter}`, notify: publishItemsChanged });

describe('События изменений Item', () => {
  it('подписчик получает событие и отписывается', () => {
    const received: string[][] = [];
    const unsubscribe = subscribeItemsChanged((event) => received.push(event.itemIds));

    publishItemsChanged({ type: 'items-changed', itemIds: ['a'] });
    unsubscribe();
    publishItemsChanged({ type: 'items-changed', itemIds: ['b'] });

    expect(received).toEqual([['a']]);
  });

  it('получает изменения из другой вкладки и игнорирует чужие сообщения', async () => {
    const received: string[][] = [];
    const unsubscribe = subscribeItemsChanged((event) => received.push(event.itemIds));
    const otherTab = new BroadcastChannel('dashflow-items');

    otherTab.postMessage({ type: 'items-changed', itemIds: ['from-tab'] });
    otherTab.postMessage({ type: 'items-changed', itemIds: [42] });
    otherTab.postMessage('мусор');
    await waitFor(() => expect(received).toEqual([['from-tab']]));

    otherTab.close();
    unsubscribe();
  });
});

describe('useItems', () => {
  const repos: ReturnType<typeof makeRepo>[] = [];
  afterEach(async () => {
    await Promise.all(repos.splice(0).map((repo) => repo.close()));
  });

  it('загружает записи и обновляется после изменения', async () => {
    const repo = makeRepo();
    repos.push(repo);
    await repo.create({ kind: 'task', title: 'Первая', status: 'todo' }, user);

    const { result } = renderHook(() => useItems(repo, { kind: 'task' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((item) => item.title)).toEqual(['Первая']);

    await act(async () => {
      await repo.create({ kind: 'task', title: 'Вторая', status: 'todo' }, user);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
  });

  it('новый объект с тем же запросом не вызывает перезагрузку', async () => {
    const repo = makeRepo();
    repos.push(repo);
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders++;
      return useItems(repo, { kind: 'note' });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const settled = renders;
    rerender();
    rerender();
    expect(renders - settled).toBe(2);
    expect(result.current.items).toEqual([]);
  });
});
