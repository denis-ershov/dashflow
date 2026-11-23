import { describe, expect, it } from 'vitest';
import type { Item } from '@/core/items';
import {
  buildItemIndex,
  normalizeSearch,
  searchItemIndex,
} from '@/features/dashboard/workspaceSearch';

function item(id: string, title: string, extra: Partial<Item> = {}): Item {
  return {
    id,
    kind: 'task',
    title,
    tags: [],
    status: 'todo',
    order: 'a0',
    version: 1,
    source: { type: 'user', id: 'local', name: 'local' },
    createdAt: '2026-11-23T00:00:00Z',
    updatedAt: '2026-11-23T00:00:00Z',
    ...extra,
  };
}

describe('Индекс рабочего пространства', () => {
  it('учитывает заголовок, тело, теги и URL, ранжирует и сохраняет порядок по свежести', () => {
    const entries = [
      item('body', 'Задача 1', { body: 'Обновить отчёт к среде' }),
      item('url', 'Ссылка', { url: 'https://example.test/report' }),
      item('prefix', 'Отчёт за ноябрь'),
      item('tag', 'Задача 2', { tags: ['отчёт'] }),
      item('title', 'Отчёт'),
    ];
    const index = buildItemIndex(entries);
    expect(searchItemIndex(index, normalizeSearch('  ОТЧЁТ  ')).map(({ id }) => id)).toEqual([
      'tag',
      'title',
      'prefix',
      'body',
    ]);
    expect(searchItemIndex(index, 'report').map(({ id }) => id)).toEqual(['url']);
    expect(searchItemIndex(index, 'отчёт', 1).map(({ id }) => id)).toEqual(['tag']);
    expect(searchItemIndex(index, '')).toEqual([]);
  });

  it('находит слово в тексте среди 10 000 записей менее чем за 100 мс', () => {
    const items = Array.from({ length: 10_000 }, (_, idx) =>
      item(String(idx), `Задача ${idx}`, { body: 'Подготовить ежемесячную сводку по проекту' }),
    );
    items.push(item('target', 'Проверить расчёты', { body: 'Переоценить сроки' }));
    const index = buildItemIndex(items);
    const start = performance.now();
    const results = searchItemIndex(index, 'переоценить');
    const elapsed = performance.now() - start;
    expect(results.map(({ id }) => id)).toEqual(['target']);
    expect(elapsed).toBeLessThan(100);
  });
});
