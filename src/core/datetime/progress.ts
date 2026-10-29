/**
 * Прогресс календарных периодов. Границы считаются календарными датами, а не
 * «сутки = 86 400 000 мс»: так проценты верны и в дни перехода на летнее/зимнее
 * время (23 и 25 часов), а високосный год не требует отдельной формулы.
 */

export type ProgressPeriod = 'year' | 'quarter' | 'month' | 'week' | 'day';

export interface PeriodProgress {
  period: ProgressPeriod;
  /** 0–100, с одним знаком после запятой */
  percent: number;
  start: Date;
  /** Начало следующего периода (не включительно) */
  end: Date;
  /** Полных календарных дней до конца периода, не считая текущий */
  remainingDays: number;
  /** Полных часов до конца периода */
  remainingHours: number;
}

const MS_PER_HOUR = 3_600_000;

export function getPeriodBounds(period: ProgressPeriod, now: Date): { start: Date; end: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (period) {
    case 'year':
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
    case 'quarter': {
      const first = Math.floor(m / 3) * 3;
      return { start: new Date(y, first, 1), end: new Date(y, first + 3, 1) };
    }
    case 'month':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    case 'week': {
      // Неделя с понедельника (ISO 8601)
      const sinceMonday = (now.getDay() + 6) % 7;
      return { start: new Date(y, m, d - sinceMonday), end: new Date(y, m, d - sinceMonday + 7) };
    }
    case 'day':
      return { start: new Date(y, m, d), end: new Date(y, m, d + 1) };
  }
}

/** Число календарных дней между полуночами двух дат (устойчиво к переходу времени) */
function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function computePeriodProgress(period: ProgressPeriod, now: Date): PeriodProgress {
  const { start, end } = getPeriodBounds(period, now);
  const total = end.getTime() - start.getTime();
  const passed = Math.min(Math.max(now.getTime() - start.getTime(), 0), total);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return {
    period,
    percent: Math.round((passed / total) * 1000) / 10,
    start,
    end,
    remainingDays: Math.max(calendarDaysBetween(today, end) - 1, 0),
    remainingHours: Math.floor((end.getTime() - now.getTime()) / MS_PER_HOUR),
  };
}
