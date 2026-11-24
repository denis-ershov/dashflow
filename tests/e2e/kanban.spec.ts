import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';

const extensionPath = path.resolve(process.cwd(), '.output/chrome-mv3');

interface Point {
  x: number;
  y: number;
}

async function touchDrag(context: BrowserContext, page: Page, from: Point, to: Point) {
  const session = await context.newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    for (let step = 1; step <= 12; step++) {
      const progress = step / 12;
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress },
        ],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await session.detach();
  }
}

for (const mode of ['mouse', 'touch'] as const) {
  test(`Kanban сохраняет перенос карточки (${mode})`, async () => {
    const mobile = mode === 'touch';
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      locale: 'en-US',
      hasTouch: mobile,
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });

    try {
      const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
      const page = await context.newPage();
      await page.goto(`chrome-extension://${new URL(worker.url()).host}/newtab.html`);
      const title = `Kanban ${mode} card`;
      const input = page.getByRole('textbox', { name: 'New task' });
      await input.fill(title);
      await input.press('Enter');
      await page.keyboard.press('Control+k');
      await page.getByRole('combobox', { name: 'Search workspace and commands' }).fill('Kanban');
      await page.getByRole('option', { name: /Add widget: Kanban/ }).click();

      const kanban = page.getByRole('region', { name: 'Kanban', exact: true });
      const handle = kanban.getByRole('button', { name: `Drag ${title}`, exact: true });
      const source = kanban.getByRole('region', { name: 'To do', exact: true });
      const destination = kanban.getByRole('region', { name: 'Done', exact: true });
      await expect(source.getByRole('button', { name: title, exact: true })).toBeVisible();
      const jump = kanban.getByRole('combobox', { name: 'Jump to column' });
      if (mobile) await expect(jump).toBeVisible();
      else await expect(jump).toBeHidden();
      expect(await kanban.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );

      await kanban.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await handle.scrollIntoViewIfNeeded();
      const destinationHeading = destination.getByRole('heading');
      await destinationHeading.scrollIntoViewIfNeeded();
      await expect(handle).toBeInViewport();
      await expect(destinationHeading).toBeInViewport();
      const handleRect = await handle.boundingBox();
      const targetRect = await destinationHeading.boundingBox();
      if (!handleRect || !targetRect) throw new Error('Ручка переноса или колонка недоступна');
      const from = {
        x: handleRect.x + handleRect.width / 2,
        y: handleRect.y + handleRect.height / 2,
      };
      const to = {
        x: targetRect.x + targetRect.width / 2,
        y: targetRect.y + targetRect.height / 2,
      };
      if (mobile) {
        await touchDrag(context, page, from, to);
      } else {
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 12 });
        await page.mouse.up();
      }

      const moved = destination.getByRole('button', { name: title, exact: true });
      await expect(moved).toBeVisible();
      await page.reload();
      await expect(moved).toBeVisible();
    } finally {
      await context.close();
    }
  });
}
