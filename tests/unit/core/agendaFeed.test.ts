import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCalendar, readCalendarUrl } from '@/core/calendar/calendarFeed';
import { MAX_ICS_BYTES } from '@/core/calendar/icalComponents';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Загрузка календаря', () => {
  const url = 'https://calendar.example.test/private.ics?token=private-token';
  const signal = () => new AbortController().signal;

  it('разрешает только прямой HTTPS и запрашивает файл без cookies и переходов', async () => {
    for (const unsafe of [
      'https://localhost/private',
      'https://10.0.0.1/private',
      'https://calendar.internal/private',
      'http://calendar.example.test/a',
      'https://login:password@calendar.example.test/a',
      'https://calendar.example.test:9000/a',
      'https://calendar.example.test/a#token',
    ])
      expect(readCalendarUrl(unsafe)).toBeUndefined();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('CALENDAR'));
    await expect(fetchCalendar(url, signal(), fetchImpl)).resolves.toEqual({
      status: 'ready',
      text: 'CALENDAR',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
      }),
    );
  });

  it('отклоняет запрос без права и не возвращает URL при сетевом отказе', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error(url));
    vi.stubGlobal('chrome', {
      runtime: { id: 'test' },
      permissions: { contains: (_: unknown, done: (granted: boolean) => void) => done(false) },
    });
    await expect(fetchCalendar(url, signal(), fetchImpl)).resolves.toEqual({
      status: 'permission',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.stubGlobal('chrome', undefined);
    await expect(fetchCalendar(url, signal(), fetchImpl)).resolves.toEqual({ status: 'network' });
  });

  it('ограничивает поток и отменяет запрос до обращения к сети', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(new Uint8Array(MAX_ICS_BYTES + 1)));
    await expect(fetchCalendar(url, signal(), fetchImpl)).resolves.toEqual({ status: 'tooLarge' });
    fetchImpl.mockClear();
    const controller = new AbortController();
    controller.abort();
    await expect(fetchCalendar(url, controller.signal, fetchImpl)).resolves.toEqual({
      status: 'cancelled',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
