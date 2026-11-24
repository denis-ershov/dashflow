import { expect } from '@playwright/test';
import { test } from './extensionFixture';

test('Inbox deadline appears in Agenda today and this week after reload', async ({
  context,
  extensionId,
}) => {
  test.setTimeout(60_000);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  await expect(page.getByTestId('grid-engine-container')).toBeVisible();

  const search = page.getByRole('combobox', { name: 'Search workspace and commands' });
  await page.keyboard.press('Control+k');
  await search.fill('Inbox');
  await page.getByRole('option', { name: /Add widget: Inbox/ }).click();

  const title = 'E2E agenda deadline';
  const inbox = page.getByRole('region', { name: 'Inbox', exact: true });
  const input = inbox.getByRole('textbox', { name: 'New inbox item' });
  await input.fill(title);
  await input.press('Enter');
  await expect(inbox.getByText(title, { exact: true })).toBeVisible();
  await inbox.getByRole('button', { name: `Actions for “${title}”` }).click();
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();

  const todayAtNoon = await page.evaluate(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T12:00`;
  });
  const scheduleDialog = page.getByRole('dialog', { name: 'Schedule' });
  await scheduleDialog.getByLabel('Date and time').fill(todayAtNoon);
  await scheduleDialog.getByRole('button', { name: 'Save', exact: true }).click();

  await page.keyboard.press('Control+k');
  await search.fill('Agenda');
  await page.getByRole('option', { name: /Add widget: Agenda/ }).click();
  const agenda = page.getByRole('region', { name: 'Agenda', exact: true });
  const period = agenda.getByRole('group', { name: 'Display period' });
  await expect(agenda.getByText(title, { exact: true })).toBeVisible();
  await period.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(agenda.getByText(title, { exact: true })).toBeVisible();

  await page.reload();
  const restoredAgenda = page.getByRole('region', { name: 'Agenda', exact: true });
  await expect(restoredAgenda.getByText(title, { exact: true })).toBeVisible();
});

test('Compact density updates spacing tokens and persists after reload', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  await expect(page.getByTestId('grid-engine-container')).toBeVisible();

  const dock = page.getByRole('navigation', { name: 'Quick controls' });
  await dock.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'DashFlow Settings', exact: true });
  await settings.getByRole('button', { name: 'Compact', exact: true }).click();

  const compactValues = async () =>
    page.evaluate(() => ({
      density: document.documentElement.getAttribute('data-density'),
      pageInline: getComputedStyle(document.documentElement)
        .getPropertyValue('--density-page-inline')
        .trim(),
    }));
  await expect.poll(compactValues).toEqual({ density: 'compact', pageInline: '1rem' });

  await page.reload();
  await expect.poll(compactValues).toEqual({ density: 'compact', pageInline: '1rem' });
});
