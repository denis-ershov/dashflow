import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // jsdom, а не node: без него нельзя проверить ни применение темы к DOM,
    // ни один компонент. Чистые функции в jsdom работают так же.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary', 'html'],
      // Базовая линия 2026-10-30 минус ~2 п.п.: порог не даёт покрытию тихо падать.
      // Поднимать вместе с ростом тестов, не опускать.
      thresholds: {
        statements: 78,
        branches: 69,
        functions: 58,
        lines: 78,
      },
    },
  },
});
