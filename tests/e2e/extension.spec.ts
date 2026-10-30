import { test as base, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output/chrome-mv3');

/** Контекст с загруженным расширением и его id из адреса сервис-воркера */
const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, provide) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await provide(context);
    await context.close();
  },
  extensionId: async ({ context }, provide) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await provide(new URL(worker.url()).host);
  },
});

test('новая вкладка рендерится без ошибок и переживает перезагрузку', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const grid = page.getByTestId('grid-engine-container');
  await expect(grid).toBeVisible();
  const widgets = grid.locator('.react-grid-item');
  await expect(widgets.first()).toBeVisible();
  const count = await widgets.count();
  expect(count).toBeGreaterThan(0);

  await page.reload();
  await expect(grid).toBeVisible();
  await expect(widgets).toHaveCount(count);

  // Ошибки сети внешних API (погода, ленты) в CI не важны — проверяем только ошибки приложения
  expect(errors.filter((text) => !/Failed to load resource|net::ERR_/.test(text))).toEqual([]);
});

test('манифест запрашивает при установке только storage и хосты погоды', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const manifest = await page.evaluate(() => chrome.runtime.getManifest());

  expect(manifest.permissions).toEqual(['storage']);
  expect(manifest.host_permissions).not.toContain('https://*/*');
  expect(manifest.optional_permissions).toEqual(['bookmarks', 'tabs', 'sessions']);
  // Название берётся из _locales по языку браузера, а не остаётся ключом __MSG_
  expect(manifest.name).toMatch(/^DashFlow — /);
});
