import { readCalendar, readText, readZone, type ContentLine } from './icalComponents';
import { parseRule, recurrenceDates } from './icalRecurrence';
import { createTimeResolver, DAY, parseCalendarDate, type CalendarDate } from './icalTime';

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay: boolean;
}

const MAX_OCCURRENCES = 1000;
const MAX_PROBES = 15_000;
const MAX_WINDOW_DAYS = 14;
type Resolve = ReturnType<typeof createTimeResolver>;
export interface CalendarWindow {
  start: number;
  end: number;
  zone: string;
}

function readDate(line: ContentLine, fallback: string): CalendarDate | undefined {
  const zone = readZone(line, '');
  const value = line.value.toUpperCase();
  const parsed = parseCalendarDate(value, zone || fallback);
  if (!parsed || (zone && (parsed.allDay || value.endsWith('Z')))) return;
  const type = /(?:^|;)VALUE=(?:"([^"]+)"|([^;]+))/i.exec(line.params);
  const knownType = (type?.[1] ?? type?.[2])?.toUpperCase();
  if (knownType && knownType !== (parsed.allDay ? 'DATE' : 'DATE-TIME')) return;
  return parsed;
}

function endsAfter(start: number, end: number, boundary: number) {
  return end === start ? start >= boundary : end > boundary;
}

function readDuration(value: string) {
  const match =
    /^\+?P(?:(\d{1,4})W|(?:(\d{1,4})D)?(?:T(?=\d)(?:(\d{1,4})H)?(?:(\d{1,4})M)?(?:(\d{1,4})S)?)?)$/.exec(
      value.toUpperCase(),
    );
  if (!match) return;
  const [, weeks, days, hours, minutes, seconds] = match;
  const wallDays = Number(weeks ?? 0) * 7 + Number(days ?? 0);
  const elapsed =
    (Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0)) * 1000;
  if (wallDays || elapsed) return { wallDays, elapsed, nominal: wallDays > 0 };
}

function eventEnd(
  duration: ContentLine | undefined,
  explicitEnd: ContentLine | undefined,
  start: CalendarDate,
  first: number,
  localZone: string,
  resolve: Resolve,
) {
  if (duration && explicitEnd) return;
  if (duration) {
    const parsed = readDuration(duration.value);
    if (!parsed || (start.allDay && /T/i.test(duration.value))) return;
    return parsed;
  }
  if (!explicitEnd) return { wallDays: start.allDay ? 1 : 0, elapsed: 0, nominal: start.allDay };
  const end = readDate(explicitEnd, localZone);
  const endTime = end && resolve(end);
  if (!end || endTime === undefined || endTime <= first || end.allDay !== start.allDay) return;
  return {
    wallDays: end.allDay ? (end.wall - start.wall) / DAY : 0,
    elapsed: end.allDay ? 0 : endTime - first,
    nominal: end.allDay,
  };
}

/** Разворачивает календарь только в запрошенном окне. Даты границ — полуоткрытый интервал. */
export function parseIcalendar(text: string, window: CalendarWindow) {
  const windowEnd = Math.min(window.end, window.start + MAX_WINDOW_DAYS * DAY);
  const input = readCalendar(text);
  const resolve = createTimeResolver();
  const output: CalendarEvent[] = [];
  let unsupported = 0;
  let truncated = input.truncated || windowEnd !== window.end;
  let probes = 0;
  const exceptions = new Set(
    input.events.flatMap((event) =>
      event.some((line) => line.name === 'RECURRENCE-ID')
        ? event.filter((line) => line.name === 'UID').map((line) => line.value)
        : [],
    ),
  );
  const seenExceptions = new Set<string>();

  function expand(event: ContentLine[], index: number): boolean {
    const get = (name: string) => event.find((line) => line.name === name);
    const uid = get('UID')?.value;
    if (uid && exceptions.has(uid)) {
      if (seenExceptions.has(uid)) return true;
      seenExceptions.add(uid);
      return false;
    }
    if (get('STATUS')?.value.toUpperCase() === 'CANCELLED') return true;
    const beginning = get('DTSTART');
    const start = beginning && readDate(beginning, window.zone);
    const first = start && resolve(start);
    if (!beginning || !start || first === undefined) return false;
    const duration = eventEnd(get('DURATION'), get('DTEND'), start, first, window.zone, resolve);
    if (!duration || get('RDATE') || get('EXRULE') || get('RECURRENCE-ID')) return false;
    const rawRule = get('RRULE');
    const absoluteStart = /Z$/i.test(beginning.value) || Boolean(readZone(beginning, ''));
    const rule = rawRule && parseRule(rawRule.value, start, absoluteStart);
    const last = rule?.until && resolve(rule.until);
    if (
      (rawRule && !rule) ||
      (rule?.until && last === undefined) ||
      event.filter((line) => line.name === 'RRULE').length > 1
    )
      return false;
    const excluded = new Set(
      event
        .filter((line) => line.name === 'EXDATE')
        .flatMap((line) =>
          line.value.split(',').map((value) => {
            const date = readDate({ ...line, value }, start.zone);
            return date && resolve(date);
          }),
        ),
    );
    const title = readText(get('SUMMARY')?.value ?? '');

    function add(wall: number, time: number) {
      if (!start || excluded.has(time)) return;
      const civilEnd = duration?.nominal
        ? resolve({ ...start, wall: wall + duration.wallDays * DAY })
        : time;
      const end = (civilEnd ?? time) + (duration?.elapsed ?? 0);
      if (time < windowEnd && endsAfter(time, end, window.start)) {
        output.push({ id: `${index}:${time}`, title, start: time, end, allDay: start.allDay });
      }
    }

    add(start.wall, first);
    if (!rule || !duration || rule.count === 1) return true;
    const from = rule.count
      ? start.wall
      : window.start - duration.wallDays * DAY - duration.elapsed - 2 * DAY;
    const stop = Math.min(windowEnd + 2 * DAY, last === undefined ? Infinity : last + 2 * DAY);
    let instances = 1;
    for (const wall of recurrenceDates(rule, start.wall, from, stop)) {
      if (++probes > MAX_PROBES || output.length >= MAX_OCCURRENCES) {
        truncated = true;
        break;
      }
      const time = resolve({ ...start, wall }, !start.allDay);
      if (time === undefined) continue;
      if (last !== undefined && time > last) break;
      add(wall, time);
      if (++instances === rule.count) break;
    }
    return true;
  }

  for (const [index, event] of input.events.entries()) {
    if (output.length >= MAX_OCCURRENCES) {
      truncated = true;
      break;
    }
    if (!expand(event, index)) unsupported++;
  }
  return { events: output.sort((a, b) => a.start - b.start), unsupported, truncated };
}
