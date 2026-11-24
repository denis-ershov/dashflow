import { commandBus } from '@/core/commands';
import { itemRepository } from '@/core/items';
import type { RssItem } from './types';

// В браузере блокировка на источник доступна во всех вкладках расширения.
// Очередь сохраняет ту же семантику в локальном окружении без Web Locks.
let saves = Promise.resolve();

export async function saveArticle(item: RssItem, fallbackTitle: string): Promise<'saved' | 'existing'> {
  const persist = async () => {
    const existing = await itemRepository.query({
      kind: 'article', tag: item.id, includeArchived: true, limit: 1,
    });
    if (existing.length) return 'existing' as const;
    await commandBus.dispatch('item.create', {
      kind: 'article',
      title: item.title || fallbackTitle,
      body: item.readerText || item.description || undefined,
      status: 'inbox',
      url: item.link === '#' ? undefined : item.link,
      tags: [item.id],
    });
    return 'saved' as const;
  };
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`dashflow:rss-save:${item.id}`, persist);
  }
  const saving = saves.then(persist);
  saves = saving.then(() => undefined, () => undefined);
  return saving;
}
