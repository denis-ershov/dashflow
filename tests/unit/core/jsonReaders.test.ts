import { describe, it, expect } from 'vitest';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  numberAt,
  stringAt,
} from '@/core/network/jsonReaders';

describe('Чтение JSON внешних API', () => {
  it('asRecord отдаёт объект или пустой объект', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(null)).toEqual({});
    expect(asRecord([1, 2])).toEqual({});
    expect(asRecord('x')).toEqual({});
  });

  it('asNumber пропускает только конечные числа', () => {
    expect(asNumber(3.5)).toBe(3.5);
    expect(asNumber(0)).toBe(0);
    expect(asNumber('3')).toBeUndefined();
    expect(asNumber(NaN)).toBeUndefined();
    expect(asNumber(Infinity)).toBeUndefined();
  });

  it('asString пропускает только непустые строки', () => {
    expect(asString('Москва')).toBe('Москва');
    expect(asString('')).toBeUndefined();
    expect(asString(42)).toBeUndefined();
  });

  it('читает ряды значений по индексу без исключений', () => {
    expect(asArray('nope')).toEqual([]);
    expect(numberAt([1, null, 'x'], 0)).toBe(1);
    expect(numberAt([1, null, 'x'], 1)).toBeUndefined();
    expect(numberAt([1, null, 'x'], 2)).toBeUndefined();
    expect(numberAt(undefined, 0)).toBeUndefined();
    expect(stringAt(['2026-10-30T10:00'], 0)).toBe('2026-10-30T10:00');
    expect(stringAt([5], 0)).toBeUndefined();
  });
});
