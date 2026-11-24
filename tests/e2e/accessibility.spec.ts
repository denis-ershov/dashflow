import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { test } from './extensionFixture';

async function audit(page: Page, selector: string) {
  const result = await new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map(({ id, nodes }) => ({
      id,
      elements: nodes.map(({ target }) => target),
    })),
  ).toEqual([]);
}

test('док, пространства и глобальный поиск проходят автоматическую проверку доступности', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const dock = page.getByRole('navigation', { name: 'Quick controls' });
  await expect(dock).toBeVisible();
  await audit(page, 'nav[aria-label="Quick controls"]');
  await dock.getByRole('button', { name: 'Spaces', exact: true }).click();
  const spaces = page.getByRole('dialog', { name: 'Spaces', exact: true });
  await expect(spaces).toBeVisible();
  await audit(page, '[role="dialog"][aria-label="Spaces"]');
  await page.keyboard.press('Escape');
  await expect(dock.getByRole('button', { name: 'Spaces', exact: true })).toBeFocused();

  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', { name: 'Search workspace and commands' });
  await expect(search).toBeFocused();
  await audit(page, '[role="dialog"][aria-label="Command palette"]');
});
