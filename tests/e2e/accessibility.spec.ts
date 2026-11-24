import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
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

async function focusByTab(page: Page, target: Locator) {
  for (let attempt = 0; attempt < 12; attempt++) {
    if (await target.evaluate((element) => document.activeElement === element)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Не удалось дойти до элемента клавишей Tab');
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

test.describe('доступность первого запуска на узком экране', () => {
  test.use({ skipOnboarding: false });

  test('онбординг доступен с клавиатуры, axe и текстом 200%', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 760 });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const onboardingRecord = await worker.evaluate(async () => {
      const values = await chrome.storage.local.get('dashflow_onboarding_v1');
      return values.dashflow_onboarding_v1;
    });
    expect(onboardingRecord).toBeUndefined();
    await page.goto(`chrome-extension://${extensionId}/newtab.html`);

    let dialog = page.getByRole('dialog', { name: 'Welcome to DashFlow' });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Continue' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await audit(page, '[role="dialog"][aria-label="Welcome to DashFlow"]');

    const targetMetrics = await dialog.evaluate((element) =>
      Array.from(element.querySelectorAll('button, input, select, textarea, [role="button"]'))
        .filter((target) => {
          const style = getComputedStyle(target);
          return style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((target) => {
          const { width, height } = target.getBoundingClientRect();
          return {
            name: target.getAttribute('aria-label') ?? target.textContent?.trim(),
            width,
            height,
          };
        }),
    );
    expect(targetMetrics.length).toBeGreaterThan(0);
    expect(targetMetrics.filter(({ width, height }) => width < 44 || height < 44)).toEqual([]);

    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const textMetrics = await dialog.evaluate((element) => ({
      dialogWidth: element.clientWidth,
      dialogScrollWidth: element.scrollWidth,
      text: Array.from(element.querySelectorAll('h3, p, label, summary')).map((node) => ({
        text: node.textContent?.trim() ?? '',
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      })),
    }));
    expect(textMetrics.dialogScrollWidth, JSON.stringify(textMetrics)).toBeLessThanOrEqual(
      textMetrics.dialogWidth,
    );
    expect(
      textMetrics.text.filter(({ clientWidth, scrollWidth }) => scrollWidth > clientWidth),
    ).toEqual([]);

    // Переключаем шаги клавиатурой; после окончания фокус не должен остаться в удалённом диалоге.
    for (const name of ['Continue', 'Continue', 'Finish']) {
      dialog = page.getByRole('dialog');
      const action = dialog.getByRole('button', { name, exact: true });
      await focusByTab(page, action);
      await expect(action).toBeFocused();
      await page.keyboard.press('Enter');
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.isConnected ?? false)).toBe(true);

    const dock = page.getByRole('navigation', { name: 'Quick controls' });
    const editGrid = dock.getByRole('button', { name: 'Edit grid', exact: true });
    await editGrid.click();
    await expect(dock.getByRole('button', { name: 'Finish editing', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const pageMetrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(pageMetrics.documentWidth).toBeLessThanOrEqual(pageMetrics.viewportWidth);
    expect(pageMetrics.bodyWidth).toBeLessThanOrEqual(pageMetrics.viewportWidth);

    const progress = page.getByRole('button', { name: /Time progress: Year 2026/ });
    await expect(progress).toBeVisible();
    await expect(progress).toContainText('Year 2026');
    await expect(progress).toContainText(/\d+(?:\.\d+)?%/);
    const progressBox = await progress.boundingBox();
    expect(progressBox).not.toBeNull();
    expect(progressBox!.x).toBeGreaterThanOrEqual(0);
    expect(progressBox!.x + progressBox!.width).toBeLessThanOrEqual(pageMetrics.viewportWidth);
    expect(progressBox!.height).toBeGreaterThanOrEqual(44);
    expect(progressBox!.width).toBeGreaterThanOrEqual(44);

    const dockTargets = await dock.getByRole('button').evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const style = getComputedStyle(button);
          return style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((button) => {
          const { left, right, width, height } = button.getBoundingClientRect();
          return { left, right, width, height };
        }),
    );
    expect(dockTargets.length).toBeGreaterThan(0);
    expect(
      dockTargets.filter(
        ({ left, right, width, height }) =>
          left < 0 || right > pageMetrics.viewportWidth || width < 44 || height < 44,
      ),
    ).toEqual([]);
  });
});
