import { describe, it, expect } from 'vitest';
import { isValidOrderKey, orderBetween, ordersBetween, ulid } from '@/core/items/ids';

describe('ULID', () => {
  it('26 символов Crockford Base32, уникален', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => ulid()));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('сортируется по времени создания', () => {
    const earlier = ulid(Date.UTC(2026, 0, 1));
    const later = ulid(Date.UTC(2026, 9, 30));
    expect(earlier < later).toBe(true);
  });
});

describe('Дробный порядок', () => {
  it('ключ всегда строго между соседями', () => {
    const a = orderBetween();
    const c = orderBetween(a);
    const b = orderBetween(a, c);
    expect(a < b && b < c).toBe(true);
    const beforeA = orderBetween(undefined, a);
    expect(beforeA < a).toBe(true);
  });

  it('добавление в конец растёт логарифмически', () => {
    let key: string | undefined;
    for (let i = 0; i < 1000; i++) key = orderBetween(key);
    expect(key?.length).toBeLessThanOrEqual(4);
  });

  it('многократная вставка в одно место сохраняет порядок', () => {
    const low = orderBetween();
    let high = orderBetween(low);
    for (let i = 0; i < 50; i++) {
      const mid = orderBetween(low, high);
      expect(low < mid && mid < high).toBe(true);
      high = mid;
    }
  });

  it('пачка ключей возрастает', () => {
    const keys = ordersBetween(undefined, undefined, 5);
    expect([...keys].sort()).toEqual(keys);
    expect(new Set(keys).size).toBe(5);
  });

  it('проверяет формат ключа', () => {
    expect(isValidOrderKey(orderBetween())).toBe(true);
    expect(isValidOrderKey('')).toBe(false);
    expect(isValidOrderKey('bad!')).toBe(false);
    expect(isValidOrderKey('a'.repeat(65))).toBe(false);
  });
});
