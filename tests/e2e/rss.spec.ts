import { expect } from '@playwright/test';
import { test } from './extensionFixture';

test('читалка прокручивает 1000 статей с ограниченным числом элементов в DOM', async ({
  context,
  extensionId,
}, testInfo) => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(async () => {
    const instanceId = 'rss-test';
    const feed = {
      id: 'synthetic-feed',
      name: 'Sample feed',
      url: 'https://api.open-meteo.com/dashflow-test/rss.xml',
    };
    const position = { i: instanceId, x: 0, y: 0, w: 8, h: 6 };
    await chrome.storage.local.set({
      dashflow_dashboard_store: {
        version: 3,
        state: {
          version: 3,
          activeSpaceId: 'home',
          layoutMode: 'canvas',
          spaces: [
            {
              id: 'home',
              title: 'Home',
              baseColumns: 12,
              gap: 16,
              instances: [
                {
                  instanceId,
                  widgetId: 'rssReader',
                  settings: {
                    feeds: [feed],
                    itemCount: 1000,
                    refreshInterval: 0,
                    viewMode: 'compact',
                    showThumbnails: false,
                  },
                },
              ],
              layouts: { xl: [position] },
            },
          ],
        },
      },
    });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dashflow_db', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('kv_store');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open the test cache'));
    });
    const transaction = db.transaction('kv_store', 'readwrite');
    const saved = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Could not seed the test cache'));
    });
    const now = Date.now();
    transaction.objectStore('kv_store').put(
      {
        key: JSON.stringify([1000, [[feed.id, feed.url, feed.name, null, null]]]),
        items: Array.from({ length: 1000 }, (_, index) => ({
          id: `synthetic-${index + 1}`,
          title: `Sample article ${index + 1}`,
          link: `https://example.test/article/${index + 1}`,
          timestamp: now - index * 60_000,
          feedId: feed.id,
          feedName: feed.name,
        })),
        failures: 0,
        savedAt: now,
        requestedAt: now,
      },
      `dashflow_rss_articles.${instanceId}`,
    );
    await saved;
    db.close();
  });

  const page = await context.newPage();
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const list = page.getByRole('list', { name: 'Articles from RSS feeds' });
  await expect(list.getByText('Sample article 1', { exact: true })).toBeVisible();
  const frames = await list.evaluate(async (element) => {
    const samples: number[] = [];
    for (let step = 1; step <= 20; step++) {
      const start = performance.now();
      element.scrollTop = ((element.scrollHeight - element.clientHeight) * step) / 20;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      samples.push(Math.round(performance.now() - start));
    }
    return samples;
  });
  await testInfo.attach('rss-scroll-frame-samples', {
    body: JSON.stringify(frames),
    contentType: 'application/json',
  });
  await expect(list.getByText('Sample article 1000', { exact: true })).toBeVisible();
  expect(await list.locator('[data-rss-position]').count()).toBeLessThan(50);
});
