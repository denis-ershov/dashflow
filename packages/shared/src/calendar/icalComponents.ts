export interface ContentLine {
  name: string;
  params: string;
  value: string;
}
export const MAX_ICS_BYTES = 1024 * 1024;
const MAX_EVENTS = 2000;
const MAX_DEPTH = 16;
const EVENT_FIELDS = new Set([
  'UID',
  'SUMMARY',
  'DTSTART',
  'DTEND',
  'DURATION',
  'STATUS',
  'RRULE',
  'RECURRENCE-ID',
  'RDATE',
  'EXDATE',
  'EXRULE',
]);

export class InvalidCalendarError extends Error {}

function readContentLine(line: string): ContentLine | undefined {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    if (line[i] !== ':' || quoted) continue;
    const header = line.slice(0, i);
    const key = header.indexOf(';');
    const name = (key < 0 ? header : header.slice(0, key)).toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(name)) return;
    return { name, params: key < 0 ? '' : header.slice(key), value: line.slice(i + 1) };
  }
}

export function readCalendar(text: string) {
  if (text.length > MAX_ICS_BYTES) throw new InvalidCalendarError();
  const stack: string[] = [];
  const events: ContentLine[][] = [];
  let event: ContentLine[] | undefined;
  let calendar = false;
  let truncated = false;
  const logicalLines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r?\n[ \t]/g, '')
    .split(/\r?\n/);
  for (const line of logicalLines) {
    if (line.length > 16_384) throw new InvalidCalendarError();
    const parsed = readContentLine(line);
    if (!parsed) continue;
    const { name, value } = parsed;
    if (name === 'BEGIN') {
      const component = value.toUpperCase();
      if (stack.length === 0) {
        if (component !== 'VCALENDAR') throw new InvalidCalendarError();
        calendar = true;
      }
      if (stack.length === 1 && component === 'VEVENT') event = [];
      stack.push(component);
      if (stack.length > MAX_DEPTH) throw new InvalidCalendarError();
    } else if (name === 'END') {
      const component = value.toUpperCase();
      if (stack.pop() !== component) throw new InvalidCalendarError();
      if (stack.length === 1 && component === 'VEVENT' && event) {
        if (events.length < MAX_EVENTS) events.push(event);
        else truncated = true;
        event = undefined;
      }
    } else if (stack.length === 2 && event && EVENT_FIELDS.has(name)) {
      event.push(parsed);
    }
  }
  if (!calendar || stack.length > 0) throw new InvalidCalendarError();
  return { events, truncated };
}

export function readText(value: string): string {
  return value
    .replace(/\\([nN,;\\])/g, (_match, token: string) =>
      token === 'n' || token === 'N' ? '\n' : token,
    )
    .trim()
    .slice(0, 300);
}

export function readZone(line: ContentLine, fallback: string): string {
  const match = /(?:^|;)TZID=(?:"([^"]+)"|([^;]+))/i.exec(line.params);
  return match?.[1] ?? match?.[2] ?? fallback;
}
