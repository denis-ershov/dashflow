import { createHash } from 'node:crypto';
import { parseIcalendar, type CalendarWindow } from '@dashflow/shared';
import type { HubRepository } from '../db/index.js';
import { calendarUrl, fetchCalendar, type CalendarNetwork } from './calendarNetwork.js';
import {
  readAgendaSnapshot,
  writeAgendaSnapshot,
  type CalendarAgendaSnapshot,
} from './calendarSnapshot.js';
import { ConnectorError, type PollingConnector } from './contract.js';
import { createConnectorRunner } from './runner.js';

export type { CalendarAgendaSnapshot } from './calendarSnapshot.js';

const DAY = 86_400_000;
const SNAPSHOT_TTL = DAY;

interface CalendarRunnerOptions {
  url: string;
  allowedHostname: string;
  repository: HubRepository;
  statePath: string;
  timezone?: string;
  intervalMs?: number;
}

function zoneId(value: string) {
  if (value.length === 0 || value.length > 100) throw new ConnectorError('CONFIGURATION');
  try {
    return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    throw new ConnectorError('CONFIGURATION');
  }
}

function parseAgenda(text: string, window: CalendarWindow) {
  const parsed = (() => {
    try {
      return parseIcalendar(text, window);
    } catch {
      throw new ConnectorError('INVALID_RESPONSE');
    }
  })();
  if (parsed.truncated) throw new ConnectorError('INCOMPLETE');
  return parsed;
}

export function createCalendarRunner(
  {
    url,
    allowedHostname,
    repository,
    statePath,
    timezone = 'UTC',
    intervalMs,
  }: CalendarRunnerOptions,
  transport?: CalendarNetwork,
) {
  const feed = calendarUrl(url, allowedHostname);
  const zone = zoneId(timezone);
  const source = createHash('sha256').update(feed.href).update('\0').update(zone).digest('hex');
  const snapshotPath = `${statePath}.agenda.json`;
  let current: CalendarAgendaSnapshot | null = null;
  let starting: Promise<void> | undefined;
  let stopped = false;
  const connector: PollingConnector = {
    id: 'calendar',
    name: 'Calendar',
    configSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        allowedHostname: { type: 'string', maxLength: 253 },
        timezone: { type: 'string', maxLength: 100 },
      },
      required: ['allowedHostname'],
    },
    async poll({ signal }) {
      const text = await fetchCalendar(feed, signal, transport);
      signal.throwIfAborted();
      const now = Date.now();
      const window = { start: now - DAY, end: now + 13 * DAY, zone };
      const parsed = parseAgenda(text, window);
      const fresh = { ...parsed, window, updatedAt: new Date(now).toISOString() };
      await writeAgendaSnapshot(snapshotPath, source, fresh);
      current = fresh;
      return { items: [] };
    },
  };
  const runner = createConnectorRunner({ connector, repository, statePath, intervalMs });
  return {
    ...runner,
    start() {
      if (stopped) return Promise.resolve();
      starting ??= (async () => {
        current = await readAgendaSnapshot(snapshotPath, source);
        if (!stopped) await runner.start();
      })();
      return starting;
    },
    async stop() {
      stopped = true;
      await runner.stop();
      await starting;
    },
    agenda(): CalendarAgendaSnapshot | null {
      if (stopped || !current) return null;
      const age = Date.now() - Date.parse(current.updatedAt);
      if (age < 0 || age >= SNAPSHOT_TTL) return null;
      return structuredClone(current);
    },
  };
}
