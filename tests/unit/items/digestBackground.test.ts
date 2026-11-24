import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startDigestBackground } from '@/core/digest/background';
import { DIGEST_ALARM, DIGEST_SCHEDULE_KEY } from '@/core/digest/model';
import type { ItemDraft, ItemQuery } from '@/core/items/types';

const mocks = vi.hoisted(() => ({
  getStorage: vi.fn(),
  getAlarm: vi.fn(),
  createAlarm: vi.fn(),
  clearAlarm: vi.fn(),
  onAlarm: vi.fn<(listener: (alarm: { name: string }) => void) => void>(),
  onChange: vi.fn<(listener: (changes: Record<string, unknown>, area: string) => void) => void>(),
  query: vi.fn<(query: ItemQuery) => Promise<readonly ItemDraft[]>>(),
  create: vi.fn<(draft: ItemDraft) => Promise<void>>(),
  readWeather: vi.fn(),
  readHeadlines: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    alarms: {
      get: mocks.getAlarm,
      create: mocks.createAlarm,
      clear: mocks.clearAlarm,
      onAlarm: { addListener: mocks.onAlarm },
    },
    storage: { local: { get: mocks.getStorage }, onChanged: { addListener: mocks.onChange } },
    runtime: { onInstalled: { addListener: vi.fn() }, onStartup: { addListener: vi.fn() } },
    i18n: { getUILanguage: () => 'ru' },
  },
}));
vi.mock('@/core/items/instance', () => ({
  itemRepository: { query: mocks.query, create: mocks.create },
}));
vi.mock('@/core/feeds/cache', () => ({ listRecentFeedHeadlines: mocks.readHeadlines }));
vi.mock('@/widgets/built-in/WeatherWidget/weatherService', () => ({
  getCachedWeatherData: mocks.readWeather,
}));

describe('Фоновый запуск утреннего дайджеста', () => {
  let enabled = false;
  let alarm: { scheduledTime: number } | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 23, 7));
    alarm = undefined;
    enabled = true;
    mocks.getStorage.mockImplementation(async (key: string) => ({
      [key]: key === DIGEST_SCHEDULE_KEY ? enabled : { state: { language: 'en' } },
    }));
    mocks.getAlarm.mockImplementation(async () => alarm);
    mocks.createAlarm.mockImplementation(async (_name: string, { when }: { when: number }) => {
      alarm = { scheduledTime: when };
    });
    mocks.query.mockImplementation(async ({ kind }) => {
      const existing = mocks.create.mock.calls[0]?.[0];
      return kind === 'digest' && existing ? [existing] : [];
    });
    mocks.readWeather.mockResolvedValue(null);
    mocks.readHeadlines.mockResolvedValue([]);
  });

  afterEach(() => vi.useRealTimers());

  it('выставляет будильник, создаёт один выпуск при параллельных сигналах и очищает расписание', async () => {
    const generate = startDigestBackground();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.createAlarm).toHaveBeenLastCalledWith(DIGEST_ALARM, {
      when: new Date(2026, 10, 23, 7, 30).getTime(),
    });

    vi.setSystemTime(new Date(2026, 10, 23, 7, 30));
    mocks.onAlarm.mock.calls[0]?.[0]({ name: DIGEST_ALARM });
    expect(await Promise.all([generate(), generate()])).toEqual([true, true]);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      status: 'unread',
      title: 'Morning · November 23, 2026',
    });
    expect(mocks.readWeather).toHaveBeenCalledTimes(1);
    expect(mocks.readHeadlines).toHaveBeenCalledTimes(1);
    expect(mocks.createAlarm).toHaveBeenLastCalledWith(DIGEST_ALARM, {
      when: new Date(2026, 10, 24, 7, 30).getTime(),
    });

    enabled = false;
    mocks.onChange.mock.calls[0]?.[0]({ [DIGEST_SCHEDULE_KEY]: {} }, 'local');
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.clearAlarm).toHaveBeenCalledWith(DIGEST_ALARM);
  });

  it('создаёт выпуск после пропущенного часа и переустанавливает будильник на следующий день', async () => {
    vi.setSystemTime(new Date(2026, 10, 23, 10));
    startDigestBackground();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.createAlarm).toHaveBeenCalledWith(DIGEST_ALARM, {
      when: new Date(2026, 10, 24, 7, 30).getTime(),
    });
  });
});
