export const DAY = 86_400_000;
export interface CalendarDate {
  wall: number;
  zone: string;
  allDay: boolean;
}

/** Время в календарном представлении кодируется как UTC, смещение применяется отдельно. */
export function parseCalendarDate(value: string, zone: string): CalendarDate | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!match) return;
  const [, y, m, d, hh, mm, ss, utc] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(y), Number(m) - 1, Number(d));
  date.setUTCHours(Number(hh ?? 0), Number(mm ?? 0), Number(ss ?? 0), 0);
  if (
    !y ||
    Number(y) === 0 ||
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() + 1 !== Number(m) ||
    date.getUTCDate() !== Number(d) ||
    date.getUTCHours() !== Number(hh ?? 0) ||
    date.getUTCMinutes() !== Number(mm ?? 0) ||
    date.getUTCSeconds() !== Number(ss ?? 0)
  )
    return;
  return { wall: date.getTime(), zone: utc ? 'UTC' : zone, allDay: hh === undefined };
}

export function createTimeResolver() {
  const formats = new Map<string, Intl.DateTimeFormat | undefined>();
  function format(zone: string) {
    if (formats.has(zone)) return formats.get(zone);
    let formatter: Intl.DateTimeFormat | undefined;
    try {
      formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        calendar: 'gregory',
        numberingSystem: 'latn',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
    } catch {
      // Неизвестный TZID помечается как неподдерживаемый.
    }
    formats.set(zone, formatter);
    return formatter;
  }

  return function resolve({ wall, zone }: CalendarDate, skipGap = false): number | undefined {
    if (zone === 'UTC') return wall;
    const formatter = format(zone);
    if (!formatter) return;
    const offset = (time: number) => {
      const parts = Object.fromEntries(
        formatter.formatToParts(time).map(({ type, value }) => [type, value]),
      );
      const local = new Date(0);
      local.setUTCFullYear(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
      local.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second), 0);
      return local.getTime() - time;
    };
    const before = offset(wall - DAY);
    const after = offset(wall + DAY);
    if (before === after) return wall - before;
    const candidates = [wall - before, wall - after].filter((time) => time + offset(time) === wall);
    if (candidates.length) return Math.min(...candidates);
    // Явное начало в пропущенном часу использует смещение до перехода, RRULE пропускает экземпляр.
    if (!skipGap) return wall - before;
  };
}
