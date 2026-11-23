import type { Item } from '@/core/items';

export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim();
}

export function matchRank(value: string, query: string): number {
  if (value === query) return 3;
  if (value.startsWith(query)) return 2;
  return value.includes(query) ? 1 : 0;
}

export function buildItemIndex(items: readonly Item[]) {
  // query() уже исключает удалённые и архивные записи и возвращает свежие первыми.
  return items.map((item) => ({
    item,
    fields: [item.title, item.body, item.url, ...item.tags]
      .filter((field): field is string => field !== undefined)
      .map(normalizeSearch),
  }));
}

export function searchItemIndex(
  index: ReturnType<typeof buildItemIndex>,
  query: string,
  limit = 12,
): Item[] {
  if (!query || limit <= 0) return [];
  const exact: Item[] = [];
  const prefix: Item[] = [];
  const contains: Item[] = [];
  for (const { item, fields } of index) {
    const rank = fields.reduce((best, field) => Math.max(best, matchRank(field, query)), 0);
    const bucket = rank === 3 ? exact : rank === 2 ? prefix : rank === 1 ? contains : null;
    if (bucket && bucket.length < limit) bucket.push(item);
  }
  return [...exact, ...prefix, ...contains].slice(0, limit);
}
