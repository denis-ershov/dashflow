import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCalendarRunner } from '../src/connectors/calendar.js';
import {
  calendarUrl,
  fetchCalendar,
  type CalendarNetwork,
} from '../src/connectors/calendarNetwork.js';
import { openHubRepository, type HubRepository } from '../src/db/index.js';

const host = 'feeds.example.test';
const secret = 'fixture_path_token';
const url = `https://${host}/calendar/${secret}?format=ics`;
const publicIp = '93.184.216.34';
const controller = () => new AbortController();

function response(body: string, status = 200, headers: IncomingMessage['headers'] = {}) {
  const message = new IncomingMessage(new Socket());
  message.statusCode = status;
  message.headers = { 'content-type': 'text/calendar; charset=utf-8', ...headers };
  message.complete = true;
  message.push(Buffer.from(body));
  message.push(null);
  return message;
}

function calendar(title?: string, start = new Date(Date.now() + 60 * 60_000)) {
  const event =
    title === undefined
      ? []
      : [
          'BEGIN:VEVENT',
          'UID:fixture-event',
          `DTSTART:${start.toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
          'DURATION:PT1H',
          `SUMMARY:${title}`,
          'END:VEVENT',
        ];
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', ...event, 'END:VCALENDAR'].join('\r\n');
}

describe('Сетевой контур календаря', () => {
  it('соединяется только с проверенным IP и сохраняет домен для Host, SNI и сертификата', async () => {
    const resolveHost = vi.fn<CalendarNetwork['resolve']>(() =>
      Promise.resolve([
        { address: publicIp, family: 4 },
        { address: '2606:4700::1111', family: 6 },
      ]),
    );
    const request = vi.fn<CalendarNetwork['request']>((options, signal) => {
      expect(options.hostname).toBe(publicIp);
      expect(options.servername).toBe(host);
      expect(options.headers).toMatchObject({ Host: host });
      const { protocol, method, agent, rejectUnauthorized, minVersion } = options;
      expect({ protocol, method, agent, rejectUnauthorized, minVersion }).toEqual({
        protocol: 'https:',
        method: 'GET',
        agent: false,
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      });
      expect(typeof options.checkServerIdentity).toBe('function');
      expect(Boolean(options.path?.includes(secret))).toBe(true);
      expect(signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(response(calendar()));
    });
    await expect(
      fetchCalendar(calendarUrl(url, host), controller().signal, { resolve: resolveHost, request }),
    ).resolves.toContain('VCALENDAR');
    expect(resolveHost).toHaveBeenCalledExactlyOnceWith(host);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['127.0.0.1', 4],
    ['169.254.169.254', 4],
    ['100.64.0.1', 4],
    ['10.4.1.2', 4],
    ['::ffff:127.0.0.1', 6],
    ['fc00::1', 6],
    ['64:ff9b::7f00:1', 6],
    ['2002:7f00:1::1', 6],
  ] as const)('отклоняет смешанный DNS-ответ до открытия сокета (%s)', async (address, family) => {
    const request = vi.fn<CalendarNetwork['request']>();
    await expect(
      fetchCalendar(calendarUrl(url, host), controller().signal, {
        resolve: () =>
          Promise.resolve([
            { address: publicIp, family: 4 },
            { address, family },
          ]),
        request,
      }),
    ).rejects.toMatchObject({ code: 'CONFIGURATION' });
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    ['http://feeds.example.test/feed', host],
    ['https://feeds.example.test:9443/feed', host],
    ['https://feeds.example.test.other.invalid/feed', host],
    ['https://feeds.example.test@other.invalid/feed', host],
    ['https://alice:pass@feeds.example.test/feed', host],
    ['https://127.0.0.1/feed', '127.0.0.1'],
    ['https://feeds.example.test/feed#part', host],
  ] as const)('требует точную конфигурацию HTTPS feed (%s)', (raw, hostname) => {
    expect(() => calendarUrl(raw, hostname)).toThrow('CONFIGURATION');
  });

  it('прерывает DNS-ожидание и исключает запрос после позднего результата', async () => {
    const abort = controller();
    let returnAddresses: ((addresses: { address: string; family: number }[]) => void) | undefined;
    const pending = new Promise<{ address: string; family: number }[]>((resolve) => {
      returnAddresses = resolve;
    });
    const request = vi.fn<CalendarNetwork['request']>();
    const result = fetchCalendar(calendarUrl(url, host), abort.signal, {
      resolve: () => pending,
      request,
    });
    abort.abort();
    await expect(result).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    returnAddresses?.([{ address: publicIp, family: 4 }]);
    await pending;
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    () => response('', 302, { location: 'https://other.invalid/feed' }),
    () => response('x'.repeat(1024 * 1024 + 1)),
    () => response('', 200, { 'content-encoding': 'gzip' }),
    () => response('<html/>', 200, { 'content-type': 'text/html' }),
  ])('отклоняет редирект, неподдерживаемый тип и поток сверх лимита', async (fixture) => {
    const request = vi.fn<CalendarNetwork['request']>(() => Promise.resolve(fixture()));
    await expect(
      fetchCalendar(calendarUrl(url, host), controller().signal, {
        resolve: () => Promise.resolve([{ address: publicIp, family: 4 }]),
        request,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('Снимок Agenda', () => {
  let directory: string;
  let repository: HubRepository;
  let statePath: string;
  const runners: ReturnType<typeof createCalendarRunner>[] = [];

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'dashflow-calendar-'));
    repository = openHubRepository(join(directory, 'hub.sqlite'));
    statePath = join(directory, 'calendar.json');
  });

  afterEach(async () => {
    await Promise.all(runners.splice(0).map((runner) => runner.stop()));
    vi.restoreAllMocks();
    repository.close();
    if (dirname(resolve(directory)) !== resolve(tmpdir()))
      throw new Error('Некорректный путь фикстуры');
    await rm(directory, { recursive: true, force: true });
  });

  async function start(request: CalendarNetwork['request'], feed = url) {
    const runner = createCalendarRunner(
      { url: feed, allowedHostname: host, repository, statePath },
      {
        resolve: () => Promise.resolve([{ address: publicIp, family: 4 }]),
        request,
      },
    );
    runners.push(runner);
    await runner.start();
    return runner;
  }

  it('заменяет событие при обновлении, а пустой feed очищает его после перезапуска', async () => {
    let body = calendar('Встреча');
    const request: CalendarNetwork['request'] = () => Promise.resolve(response(body));
    const first = await start(request);
    expect((await first.pollNow()).state).toBe('ok');
    expect(first.agenda()?.events.map(({ title }) => title)).toEqual(['Встреча']);
    body = calendar('Другое время', new Date(Date.now() + 120 * 60_000));
    await first.pollNow();
    expect(first.agenda()?.events.map(({ title }) => title)).toEqual(['Другое время']);
    expect(repository.listItems().items).toEqual([]);
    await first.stop();
    const second = await start(request);
    expect(second.agenda()?.events.map(({ title }) => title)).toEqual(['Другое время']);
    expect((await readFile(`${statePath}.agenda.json`, 'utf8')).includes(secret)).toBe(false);
    body = calendar();
    expect((await second.pollNow()).state).toBe('ok');
    expect(second.agenda()?.events).toEqual([]);
  });

  it('сохраняет последнюю корректную версию при ошибке, ограничивает срок и изолирует смену URL', async () => {
    const clock = vi.spyOn(Date, 'now');
    const now = Date.now();
    let body = calendar('Приватное событие');
    const request: CalendarNetwork['request'] = () => Promise.resolve(response(body));
    const first = await start(request);
    await first.pollNow();
    body = 'BEGIN:VCALENDAR';
    expect((await first.pollNow()).lastError).toBe('INVALID_RESPONSE');
    expect(first.agenda()?.events).toHaveLength(1);
    clock.mockReturnValue(now + 2 * 86_400_000);
    expect(first.agenda()).toBeNull();
    clock.mockReturnValue(now);
    await first.stop();
    const changed = await start(request, `https://${host}/a-different-feed`);
    expect(changed.agenda()).toBeNull();
  });
});
