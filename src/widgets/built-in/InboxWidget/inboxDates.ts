import { toLocalDateKey } from '@/core/datetime';
import type { Item } from '@/core/items';

export function groupByLocalDay(items: readonly Item[]) {
  const groups = new Map<string, { date: Date; items: Item[] }>();
  for (const item of items) {
    const date = new Date(item.createdAt);
    const day = toLocalDateKey(date);
    const group = groups.get(day);
    if (group) group.items.push(item);
    else groups.set(day, { date, items: [item] });
  }
  return groups;
}

export function toDateTimeInput(value: Date): string {
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  return `${toLocalDateKey(value)}T${hour}:${minute}`;
}

export function parseDateTimeInput(value: string): string | null {
  const date = new Date(value);
  // Обратное преобразование проверяет календарь и пропущенный при переводе часов час.
  return Number.isFinite(date.getTime()) && toDateTimeInput(date) === value
    ? date.toISOString()
    : null;
}
