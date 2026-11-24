import type { CalendarEvent } from '@/core/calendar/ical';
import type { Item } from '@/core/items';

export interface AgendaDay {
  start: number;
  end: number;
}
export type AgendaEntry = CalendarEvent & { task?: boolean };

export function getAgendaDays(today: number, week: boolean): AgendaDay[] {
  const boundary = new Date(today);
  boundary.setHours(0, 0, 0, 0);
  if (week) {
    boundary.setDate(boundary.getDate() - ((boundary.getDay() + 6) % 7));
    boundary.setHours(0, 0, 0, 0);
  }
  return Array.from({ length: week ? 7 : 1 }, () => {
    const start = +boundary;
    boundary.setDate(boundary.getDate() + 1);
    boundary.setHours(0, 0, 0, 0);
    return { start, end: +boundary };
  });
}

export function listAgendaEntries(
  items: Item[],
  events: CalendarEvent[],
  start: number,
  end: number,
): AgendaEntry[] {
  const tasks = items.flatMap<AgendaEntry>((item) => {
    const deadline = Date.parse(item.dueAt ?? '');
    return deadline >= start && deadline < end && item.status !== 'done'
      ? [
          {
            id: item.id,
            title: item.title,
            start: deadline,
            end: deadline,
            allDay: false,
            task: true,
          },
        ]
      : [];
  });
  return [...tasks, ...events].sort(
    (a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start,
  );
}

export function onAgendaDay(entry: AgendaEntry, day: AgendaDay) {
  return (
    entry.start < day.end &&
    (entry.start === entry.end ? entry.start >= day.start : entry.end > day.start)
  );
}
