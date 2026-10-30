import { defineConfig } from '@playwright/test';

/**
 * E2E-проверка собранного расширения в настоящем Chromium: манифест, CSP, сервис-воркер и
 * рендер новой вкладки, которые jsdom-тесты не видят. Перед запуском нужна сборка
 * `npm run build:chrome`.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    trace: 'retain-on-failure',
  },
});
