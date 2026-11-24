import type { CalendarEvent } from '@/core/calendar/ical';
import { asRecord } from '@/core/network/jsonReaders';

export {
  INTEGRATION_IDS,
  readIntegrationStatus,
  type HubIntegrationStatus,
  type IntegrationId,
} from '../../../packages/shared/src/integrations';

export const HUB_INTEGRATIONS = 'dashflow:hub-integrations';
export const HUB_INTEGRATION_POLL = 'dashflow:hub-integration-poll';
export const HUB_CALENDAR_AGENDA = 'dashflow:hub-calendar-agenda';

function calendarTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= 8.64e15;
}

function readCalendarEvent(value: unknown): CalendarEvent {
  const { id, title, start, end, allDay } = asRecord(value);
  if (
    typeof id !== 'string' ||
    id.length > 40 ||
    !/^\d+:-?\d+$/.test(id) ||
    typeof title !== 'string' ||
    title.length > 300 ||
    !calendarTimestamp(start) ||
    !calendarTimestamp(end) ||
    end < start ||
    typeof allDay !== 'boolean'
  ) {
    throw new Error('INVALID_HUB_CALENDAR_EVENT');
  }
  return { id, title, start, end, allDay };
}

export function readHubCalendar(value: unknown) {
  if (value === null) return null;
  const { events, unsupported, truncated } = asRecord(value);
  if (
    !Array.isArray(events) ||
    events.length > 1000 ||
    typeof unsupported !== 'number' ||
    !Number.isSafeInteger(unsupported) ||
    unsupported < 0 ||
    typeof truncated !== 'boolean'
  ) {
    throw new Error('INVALID_HUB_CALENDAR');
  }
  return { events: events.map(readCalendarEvent), unsupported, truncated };
}
