import { describe, expect, it } from 'vitest';
import { parseIcalendar } from '@/core/calendar/ical';

const event = (...fields: string[]) => ['BEGIN:VEVENT', ...fields, 'END:VEVENT'];
const file = (...fields: string[][]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...fields.flat(), 'END:VCALENDAR'].join('\r\n');
const window = (from: string, to: string, zone = 'UTC') => ({
  start: Date.parse(from),
  end: Date.parse(to),
  zone,
});

describe('Календарь iCalendar', () => {
  it('сохраняет час начала еженедельного события при переходе на летнее время', () => {
    const text = file(
      event(
        'UID:weekly',
        'DTSTART;TZID="America/New_York":20260301T100000',
        'DTEND;TZID="America/New_York":20260301T110000',
        'RRULE:FREQ=WEEKLY;BYDAY=SU;COUNT=3',
        'SUMMARY:Встреча\\, которую перено\r\n сили',
      ),
    );
    const result = parseIcalendar(text, window('2026-03-01T00:00:00Z', '2026-03-15T00:00:00Z'));
    expect(result.unsupported).toBe(0);
    expect(
      result.events.map(({ start, end, title }) => [
        new Date(start).toISOString(),
        (end - start) / 3600000,
        title,
      ]),
    ).toEqual([
      ['2026-03-01T15:00:00.000Z', 1, 'Встреча, которую переносили'],
      ['2026-03-08T14:00:00.000Z', 1, 'Встреча, которую переносили'],
    ]);
  });

  it('не засчитывает недопустимый час перехода DST в COUNT и учитывает EXDATE', () => {
    const text = file(
      event(
        'DTSTART;TZID=America/New_York:20260307T023000',
        'RRULE:FREQ=DAILY;COUNT=3',
        'EXDATE;TZID=America/New_York:20260309T023000',
      ),
    );
    const result = parseIcalendar(text, window('2026-03-07T00:00:00Z', '2026-03-12T00:00:00Z'));
    expect(result.events.map(({ start }) => new Date(start).toISOString())).toEqual([
      '2026-03-07T07:30:00.000Z',
      '2026-03-10T06:30:00.000Z',
    ]);
  });

  it('включает UNTIL и сохраняет локальные даты событий на весь день и floating DTSTART', () => {
    const text = file(
      event('DTSTART;VALUE=DATE:20261122', 'DTEND;VALUE=DATE:20261124', 'SUMMARY:Отпуск'),
      event('DTSTART:20261123T090000', 'RRULE:FREQ=DAILY;UNTIL=20261124T090000', 'SUMMARY:Кофе'),
    );
    const range = window('2026-11-22T21:00:00Z', '2026-11-26T21:00:00Z', 'Europe/Moscow');
    const result = parseIcalendar(text, range);
    expect(
      result.events.map(({ start, allDay }) => [new Date(start).toISOString(), allDay]),
    ).toEqual([
      ['2026-11-21T21:00:00.000Z', true],
      ['2026-11-23T06:00:00.000Z', false],
      ['2026-11-24T06:00:00.000Z', false],
    ]);
  });

  it('пропускает сложные повторения и часовые пояса вне базы IANA', () => {
    const text = file(
      event('DTSTART:20261123T090000Z', 'RRULE:FREQ=MONTHLY;BYDAY=2MO'),
      event('DTSTART;TZID=Vendor/Unknown:20261123T090000'),
      event('UID:adjusted', 'DTSTART:20261123T090000Z', 'RRULE:FREQ=DAILY'),
      event('UID:adjusted', 'RECURRENCE-ID:20261123T090000Z', 'DTSTART:20261123T100000Z'),
      event('DTSTART:20261124T110000Z', 'SUMMARY:Допустимое событие'),
    );
    const result = parseIcalendar(text, window('2026-11-23', '2026-11-25'));
    expect(result.unsupported).toBe(3);
    expect(result.events.map(({ title }) => title)).toEqual(['Допустимое событие']);
  });

  it('перепрыгивает старые бесконечные повторы и ограничивает окно', () => {
    const result = parseIcalendar(
      file(event('DTSTART:19000101T100000Z', 'RRULE:FREQ=DAILY')),
      window('2026-11-23', '2027-11-23'),
    );
    expect(result.events).toHaveLength(14);
    expect(result.truncated).toBe(true);
    expect(() => parseIcalendar('www.example.test', window('2026-11-23', '2026-11-24'))).toThrow();
  });
});
