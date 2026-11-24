import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test';
import path from 'node:path';

const extension = path.resolve(process.cwd(), '.output/chrome-mv3');

/** Помечает изолированный профиль как уже настроенный до открытия новой вкладки. */
export async function skipOnboardingForTest(context: BrowserContext): Promise<Worker> {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(async (key) => {
    await chrome.storage.local.set({ [key]: { dismissed: true } });
  }, 'dashflow_onboarding_v1');
  return worker;
}

/** Изолированный профиль с загруженным расширением. Обычные E2E начинают после онбординга. */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  skipOnboarding: boolean;
}>({
  skipOnboarding: [true, { option: true }],
  context: async ({ skipOnboarding }, provide) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      locale: 'en-US',
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    try {
      if (skipOnboarding) {
        await skipOnboardingForTest(context);
      }
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
