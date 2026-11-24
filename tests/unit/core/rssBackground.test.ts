import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import { startRssBackground } from '@/core/feeds/background';
import { readArticleSnapshot } from '@/core/feeds/cache';
import { feedSnapshotKey } from '@/core/feeds/refresh';
import { STORAGE_KEYS } from '@/core/storage';
import type * as browserPermissions from '@/core/permissions/browserPermissions';

const mocks = vi.hoisted(() => ({
  getStorage: vi.fn(),
  createAlarm: vi.fn(),
  alarmListener: vi.fn<(listener: (alarm: { name: string }) => void) => void>(),
  checkPermissions: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    alarms: {
      get: vi.fn().mockResolvedValue(undefined),
      create: mocks.createAlarm,
      onAlarm: { addListener: mocks.alarmListener },
    },
    storage: { local: { get: mocks.getStorage } },
    runtime: { onInstalled: { addListener: vi.fn() }, onStartup: { addListener: vi.fn() } },
  },
}));
vi.mock('@/core/permissions/browserPermissions', async (original) => ({
  ...(await original<typeof browserPermissions>()),
  hasBrowserPermissions: mocks.checkPermissions,
}));

afterEach(() => vi.unstubAllGlobals());

it('обновляет ленты с выданными правами раз в 30 минут', async () => {
  const allowed = { id: 'yes', url: 'https://allowed.test/rss', name: 'Allowed' };
  const denied = { id: 'no', url: 'https://denied.test/rss', name: 'Denied' };
  const feeds = [allowed, denied];
  const instance = { instanceId: 'rss-alarm', widgetId: 'rssReader', settings: { feeds } };
  mocks.getStorage.mockResolvedValue({
    [STORAGE_KEYS.DASHBOARD]: { state: { instances: [instance] } },
  });
  mocks.checkPermissions.mockImplementation(async ({ origins }: { origins: string[] }) =>
    origins.includes('https://allowed.test/*'),
  );
  const fetchFeed = vi.fn(
    async () => new Response('<rss><channel><item><title>Статья</title></item></channel></rss>'),
  );
  vi.stubGlobal('fetch', fetchFeed);

  startRssBackground();
  await vi.waitFor(() =>
    expect(mocks.createAlarm).toHaveBeenCalledWith('dashflow-rss-refresh', { periodInMinutes: 30 }),
  );
  mocks.alarmListener.mock.calls[0]?.[0]({ name: 'dashflow-rss-refresh' });

  const key = feedSnapshotKey(feeds, 15);
  await vi.waitFor(async () => {
    expect(await readArticleSnapshot(instance.instanceId, key)).toMatchObject({
      items: [expect.objectContaining({ title: 'Статья' })],
      failures: 1,
    });
  });
  expect(fetchFeed).toHaveBeenCalledExactlyOnceWith(
    allowed.url,
    expect.objectContaining({ redirect: 'error' }),
  );
});
