import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Каталоги нового кода. Список расширяется по мере переезда: страж имеет смысл
 * только там, где дизайн-система уже действует, иначе он завалит сборку на
 * легаси, которое переписывается в следующих этапах.
 */
const SCOPE = ['src/core', 'src/ui', 'src/features/appearance'];

interface SourceFile {
  path: string;
  text: string;
}

function sourceFiles(): SourceFile[] {
  const files: SourceFile[] = [];
  for (const dir of SCOPE) {
    const absolute = resolve(ROOT, dir);
    // Каталог может ещё не существовать: он появляется в своей задаче этапа.
    if (!existsSync(absolute)) continue;
    for (const entry of readdirSync(absolute, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(entry)) continue;
      const path = `${dir}/${entry.replace(/\\/g, '/')}`;
      files.push({ path, text: readFileSync(resolve(absolute, entry), 'utf8') });
    }
  }
  return files;
}

const FILES = sourceFiles();

const BANNED: { pattern: RegExp; reason: string }[] = [
  { pattern: /text-\[\d+px\]/, reason: 'произвольный размер шрифта вне шкалы' },
  { pattern: /\b[pmw]?[xytrbl]?-[0-9]+\.5\b/, reason: 'половинный шаг отступа вне шкалы' },
  { pattern: /\bz-(?:[0-9]+|auto)\b/, reason: 'магический z-index вместо z-[var(--z-*)]' },
  { pattern: /\bduration-(?:3\d\d|[4-9]\d\d|\d{4,})\b/, reason: 'анимация длиннее 250 ms' },
  {
    pattern:
      /\b(?:bg|text|border|ring|from|to|via)-(?:red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|slate|gray|zinc|neutral|stone)-\d{2,3}\b/,
    reason: 'цвет вне палитры темы',
  },
  { pattern: /\b(?:bg|text|border)-white\b/, reason: 'белый вне палитры темы' },
  {
    pattern: /animate-in|fade-in-|zoom-in-|slide-in-from-/,
    reason: 'класс несуществующего плагина tailwindcss-animate',
  },
];

describe('страж шкал дизайн-системы', () => {
  it('находит файлы для проверки', () => {
    expect(FILES.length).toBeGreaterThan(0);
  });

  for (const { pattern, reason } of BANNED) {
    it(reason, () => {
      const offenders = FILES.filter((file) => pattern.test(file.text)).map((file) => file.path);
      expect(offenders).toEqual([]);
    });
  }
});
