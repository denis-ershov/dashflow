import { DAY, parseCalendarDate, type CalendarDate } from './icalTime';

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const SUPPORTED_KEYS = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'COUNT', 'UNTIL', 'WKST']);

export interface CalendarRule {
  frequency: 'DAILY' | 'WEEKLY';
  interval: number;
  days?: number[];
  weekStart: number;
  count?: number;
  until?: CalendarDate;
}

function positiveInteger(input: string): number | undefined {
  if (!/^\d{1,9}$/.test(input)) return;
  const value = Number(input);
  return value > 0 ? value : undefined;
}

export function parseRule(
  value: string,
  start: CalendarDate,
  absoluteStart: boolean,
): CalendarRule | undefined {
  const fields = new Map<string, string>();
  for (const field of value.toUpperCase().split(';')) {
    const [key, entry, extra] = field.split('=');
    if (!key || !entry || extra !== undefined || fields.has(key) || !SUPPORTED_KEYS.has(key))
      return;
    fields.set(key, entry);
  }
  const frequency = fields.get('FREQ');
  if (frequency !== 'DAILY' && frequency !== 'WEEKLY') return;
  const interval = positiveInteger(fields.get('INTERVAL') ?? '1');
  const countInput = fields.get('COUNT');
  const untilInput = fields.get('UNTIL');
  const count = countInput && positiveInteger(countInput);
  const until = untilInput ? parseCalendarDate(untilInput, start.zone) : undefined;
  const days = fields
    .get('BYDAY')
    ?.split(',')
    .map((day) => WEEKDAYS.indexOf(day));
  const weekStart = WEEKDAYS.indexOf(fields.get('WKST') ?? 'MO');
  if (
    !interval ||
    (countInput && !count) ||
    (untilInput && !until) ||
    (count && until) ||
    (until && until.allDay !== start.allDay) ||
    days?.some((day) => day < 0) ||
    weekStart < 0
  )
    return;
  if (until && !start.allDay && untilInput?.endsWith('Z') !== absoluteStart) return;
  return { frequency, interval, count: count || undefined, until, days, weekStart };
}

export function* recurrenceDates(
  rule: CalendarRule,
  firstWall: number,
  fromWall: number,
  toWall: number,
) {
  const firstDay = new Date(firstWall).getUTCDay();
  if (rule.frequency === 'DAILY') {
    if (rule.interval % 7 === 0 && rule.days && !rule.days.includes(firstDay)) return;
    const step = rule.interval * DAY;
    let wall = firstWall + Math.max(1, Math.floor((fromWall - firstWall) / step)) * step;
    for (; wall <= toWall; wall += step) {
      if (!rule.days || rule.days.includes(new Date(wall).getUTCDay())) yield wall;
    }
    return;
  }
  const week = firstWall - ((firstDay + 7 - rule.weekStart) % 7) * DAY;
  const offsets = [...new Set(rule.days ?? [firstDay])]
    .map((day) => ((day + 7 - rule.weekStart) % 7) * DAY)
    .sort((a, b) => a - b);
  const step = rule.interval * 7 * DAY;
  for (
    let origin = week + Math.max(0, Math.floor((fromWall - week) / step)) * step;
    origin <= toWall;
    origin += step
  ) {
    for (const offset of offsets) {
      const wall = origin + offset;
      if (wall > firstWall && wall <= toWall) yield wall;
    }
  }
}
