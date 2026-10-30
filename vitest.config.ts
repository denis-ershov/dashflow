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
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text-summary', 'html'],
      // Базовая линия 2026-10-30 (Vitest 5: v8 считает по AST, а не по строкам, поэтому цифры
      // ниже, чем на Vitest 2 при тех же тестах) минус ~2 п.п. Поднимать вместе с тестами, не опускать.
      thresholds: {
        statements: 65,
        branches: 58,
        functions: 56,
        lines: 66,
      },
    },
  },
});
