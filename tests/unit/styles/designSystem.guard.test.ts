import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Стражи дизайн-системы: ловят обходы токенов, которые не видит ни TypeScript,
 * ни ESLint, — классы в строках .ts-файлов, ссылки на несуществующие переменные,
 * размеры шрифта вне шкалы. Каждый пункт — реальный дефект из аудита 2026-10-29.
 */

const ROOT = resolve(__dirname, '../../..');
const SRC = join(ROOT, 'src');

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const sourceFiles = listFiles(SRC).filter((f) => /\.(ts|tsx|css|html)$/.test(f));
const sources = sourceFiles.map((file) => ({
  file: relative(ROOT, file).replace(/\\/g, '/'),
  text: readFileSync(file, 'utf8'),
}));

function findAll(pattern: RegExp): string[] {
  return sources.flatMap(({ file, text }) =>
    [...text.matchAll(pattern)].map((m) => `${file}: ${m[0]}`),
  );
}

/**
 * Иллюстративные цвета данных: погодные иконки, шкала качества воздуха,
 * градиенты-заглушки закладок, полосы прогресса, иконки поисковиков.
 * Это не элементы интерфейса, их смысл — в самом оттенке, поэтому токены темы к ним не применяются.
 */
const ILLUSTRATION_PALETTE_FILES = new Set([
  'src/widgets/built-in/WeatherWidget/WeatherWidget.tsx',
  'src/widgets/built-in/WeatherWidget/weatherService.ts',
  'src/widgets/built-in/BookmarksWidget/bookmarkStyles.ts',
  'src/widgets/built-in/YearProgressWidget/YearProgressWidget.tsx',
  'src/widgets/built-in/SearchWidget/SearchWidget.tsx',
]);

describe('Стражи дизайн-системы', () => {
  it('нет размеров шрифта в пикселях вне шкалы (text-[Npx])', () => {
    expect(findAll(/\btext-\[\d+(?:\.\d+)?px\]/g)).toEqual([]);
  });

  it('нет радиусов-псевдонимов вне шкалы темы (rounded-2xl, rounded-3xl, rounded-4xl)', () => {
    expect(findAll(/\brounded-(?:[a-z]+-)?(?:2xl|3xl|4xl)\b/g)).toEqual([]);
  });

  it('каждая var(--…) ссылается на объявленную переменную', () => {
    const declared = new Set(
      sources.flatMap(({ text }) => [...text.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])),
    );
    // Переменные палитры, которые Theme Engine печатает из ключей токенов
    const themeKeys = readFileSync(join(SRC, 'core/theme/tokens.ts'), 'utf8');
    for (const m of themeKeys.matchAll(/'([a-z][a-zA-Z0-9]*)'/g)) {
      declared.add(`--dashflow-${m[1].replace(/([A-Z0-9])/g, '-$1').toLowerCase()}`);
    }

    const missing = findAll(/var\((--[a-z0-9-]+)/g)
      .map((hit) => hit.replace(/var\(/, ''))
      .filter((hit) => !declared.has(hit.split(': ')[1]));
    expect(missing).toEqual([]);
  });

  it('цветовые утилиты используют только токены темы', () => {
    const tokens = readFileSync(join(SRC, 'styles/tokens.css'), 'utf8');
    const colorTokens = new Set([...tokens.matchAll(/--color-([a-z-]+)\s*:/g)].map((m) => m[1]));
    const allowed = new Set([
      ...colorTokens,
      'white',
      'black',
      'transparent',
      'current',
      'inherit',
    ]);

    const utility =
      /\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|placeholder)-((?:[a-z]+-)*[a-z]+)(?:-\d{2,3})?(?:\/\d+)?\b/g;
    const palette =
      /^(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)$/;

    const violations = sources
      .filter(({ file }) => /\.(ts|tsx)$/.test(file) && !ILLUSTRATION_PALETTE_FILES.has(file))
      .flatMap(({ file, text }) =>
        [...text.matchAll(utility)]
          .filter((m) => palette.test(m[1]) || /-elevated$|-fg$/.test(m[1]))
          .filter((m) => !allowed.has(m[1]))
          .map((m) => `${file}: ${m[0]}`),
      );
    expect(violations).toEqual([]);
  });

  it('страница новой вкладки не грузит шрифты с внешних CDN', () => {
    const html = readFileSync(join(SRC, 'entrypoints/newtab/index.html'), 'utf8');
    const config = readFileSync(join(ROOT, 'wxt.config.ts'), 'utf8');
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(config).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
