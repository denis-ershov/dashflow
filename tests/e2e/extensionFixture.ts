import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const extension = path.resolve(process.cwd(), '.output/chrome-mv3');

/** Изолированный профиль с загруженным расширением. */
export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, provide) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      locale: 'en-US',
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    try {
      await provide(context);
    } finally {
      await context.close();
    }
  },
  extensionId: async ({ context }, provide) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await provide(new URL(worker.url()).host);
  },
});
