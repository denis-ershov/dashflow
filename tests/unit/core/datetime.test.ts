import { describe, it, expect } from 'vitest';
import {
  computePeriodProgress,
  getPeriodBounds,
  getDayPart,
  getClockParts,
  toTimeZone,
} from '@/core/datetime';

describe('getDayPart', () => {
  it('делит сутки на утро, день, вечер и ночь по границам 5/12/18/23', () => {
    expect([4, 5, 11, 12, 17, 18, 22, 23, 0].map(getDayPart)).toEqual([
      'night',
      'morning',
      'morning',
      'day',
      'day',
      'evening',
      'evening',
      'night',
      'night',
    ]);
  });
});

describe('getClockParts', () => {
  it('форматирует 24- и 12-часовое время с ведущими нулями', () => {
    const date = new Date(2026, 9, 29, 0, 5, 9);
    expect(getClockParts(date, false)).toEqual({
      hours: '00',
      minutes: '05',
      seconds: '09',
      meridiem: '',
    });
    expect(getClockParts(date, true)).toEqual({
      hours: '12',
      minutes: '05',
      seconds: '09',
      meridiem: 'AM',
    });
    expect(getClockParts(new Date(2026, 9, 29, 13, 0), true).meridiem).toBe('PM');
  });
});

describe('toTimeZone', () => {
  it('для local и неизвестного пояса возвращает исходную дату', () => {
    const date = new Date(2026, 9, 29, 12, 0);
    expect(toTimeZone(date, 'local')).toBe(date);
    expect(toTimeZone(date, 'Not/AZone')).toBe(date);
  });
});

describe('getPeriodBounds', () => {
  it('неделя начинается с понедельника, в том числе когда сегодня воскресенье', () => {
    const sunday = new Date(2026, 10, 1, 15, 0); // 1 ноября 2026 — воскресенье
    const { start, end } = getPeriodBounds('week', sunday);
    expect(start).toEqual(new Date(2026, 9, 26));
    expect(end).toEqual(new Date(2026, 10, 2));
  });

  it('квартал и месяц берутся по календарю', () => {
    const now = new Date(2026, 10, 15);
    expect(getPeriodBounds('quarter', now)).toEqual({
      start: new Date(2026, 9, 1),
      end: new Date(2027, 0, 1),
    });
    expect(getPeriodBounds('month', now)).toEqual({
      start: new Date(2026, 10, 1),
      end: new Date(2026, 11, 1),
    });
  });
});

describe('computePeriodProgress', () => {
  it('полдень — половина дня', () => {
    const progress = computePeriodProgress('day', new Date(2026, 5, 15, 12, 0));
    expect(progress.percent).toBe(50);
    expect(progress.remainingHours).toBe(12);
    expect(progress.remainingDays).toBe(0);
  });

  it('учитывает високосный год', () => {
    // 1 июля 2028 (високосный): прошло 182 дня из 366
    const progress = computePeriodProgress('year', new Date(2028, 6, 1));
    expect(progress.percent).toBe(Math.round((182 / 366) * 1000) / 10);
  });

  it('считает оставшиеся дни месяца без текущего дня', () => {
    expect(computePeriodProgress('month', new Date(2026, 9, 29, 10)).remainingDays).toBe(2);
    expect(computePeriodProgress('month', new Date(2026, 9, 31, 23)).remainingDays).toBe(0);
  });

  it('проценты всегда в диапазоне 0–100', () => {
    for (const period of ['year', 'quarter', 'month', 'week', 'day'] as const) {
      const { percent } = computePeriodProgress(period, new Date(2026, 11, 31, 23, 59, 59));
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });
});
