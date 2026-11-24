import { expect, type BrowserContext } from '@playwright/test';
import { test } from './extensionFixture';

const dashboardKey = 'dashflow_dashboard_store';

test.use({ skipOnboarding: false });

async function openNewTab(context: BrowserContext, extensionId: string) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  return page;
}

test('первый запуск показывает онбординг, а пропуск сохраняется после перезагрузки', async ({
  context,
  extensionId,
}) => {
  const page = await openNewTab(context, extensionId);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/City for weather|Город для погоды/i)).toBeVisible();
  await expect(
    dialog.getByText(/location access is never requested|геопозиция не запрашивается/i),
  ).toBeVisible();
  await dialog.getByRole('button', { name: /Skip setup|Пропустить настройку/i }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('старый профиль не получает онбординг', async ({ context, extensionId }) => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(async (key) => {
    await chrome.storage.local.set({ [key]: { state: { version: 3 }, version: 3 } });
  }, dashboardKey);

  const page = await openNewTab(context, extensionId);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main')).toBeVisible();
});
