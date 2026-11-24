import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const extension = fileURLToPath(new URL('../.output/chrome-mv3/', import.meta.url));
const lcpBudgetMs = 300;
const samples = [];
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  locale: 'en-US',
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.route(/^https?:/, (route) => route.abort());
  await page.addInitScript(() => {
    globalThis.dashflowLcp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) globalThis.dashflowLcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  await page.goto(`chrome-extension://${id}/newtab.html`);
  const firstWidget = page.getByTestId('grid-engine-container').locator('.react-grid-item').first();
  await firstWidget.waitFor();

  for (let sample = 0; sample < 3; sample++) {
    await page.reload();
    await firstWidget.waitFor();
    await page.waitForTimeout(750);
    const lcp = await page.evaluate(() => globalThis.dashflowLcp);
    if (!(lcp > 0)) throw new Error('Chromium не зарегистрировал LCP новой вкладки');
    samples.push(lcp);
  }
} finally {
  await context.close();
}

const sorted = samples.sort((a, b) => a - b);
const median = sorted[1];
console.log(
  `Тёплый LCP (мс) · ${sorted.map(Math.round).join(', ')} · медиана ${Math.round(median)} / ${lcpBudgetMs}`,
);
if (median > lcpBudgetMs) process.exitCode = 1;
