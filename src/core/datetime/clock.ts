export type DayPart = 'morning' | 'day' | 'evening' | 'night';

/** Утро 5–11, день 12–17, вечер 18–22, ночь 23–4 */
export function getDayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export const DAY_PART_ICONS: Readonly<Record<DayPart, string>> = {
  morning: '🌅',
  day: '☀️',
  evening: '🌆',
  night: '🌙',
};

export interface ClockParts {
  hours: string;
  minutes: string;
  seconds: string;
  /** 'AM' | 'PM' в 12-часовом формате, иначе пустая строка */
  meridiem: string;
}

export function getClockParts(date: Date, hour12: boolean): ClockParts {
  const h = date.getHours();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    hours: pad(hour12 ? h % 12 || 12 : h),
    minutes: pad(date.getMinutes()),
    seconds: pad(date.getSeconds()),
    meridiem: hour12 ? (h >= 12 ? 'PM' : 'AM') : '',
  };
}

/**
 * Время в указанном часовом поясе как «настенные часы» этого пояса.
 * Неизвестный пояс или 'local' — возвращается исходная дата.
 */
export function toTimeZone(date: Date, timeZone: string | undefined): Date {
  if (!timeZone || timeZone === 'local') return date;
  try {
    return new Date(date.toLocaleString('en-US', { timeZone }));
  } catch {
    return date;
  }
}
