import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Комментарии вырезаются до разбора: заголовок файла упоминает «@theme inline»
// прозой, и без этого block() нашёл бы комментарий вместо блока.
const CSS = readFileSync(resolve(__dirname, '../../../src/styles/tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Возвращает тело первого блока, начинающегося с указанного селектора или директивы. */
function block(header: string): string {
  const start = CSS.indexOf(header);
  expect(start, `блок «${header}» не найден`).toBeGreaterThanOrEqual(0);
  const open = CSS.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1;
    if (CSS[i] === '}') {
      depth -= 1;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  throw new Error(`блок «${header}» не закрыт`);
}

function declaredValue(source: string, name: string): string | undefined {
  const match = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(source);
  return match?.[1].trim();
}

describe('tokens.css — контракт шкал', () => {
  it('шкала z-index задана целиком и в правильном порядке', () => {
    const expected = {
      '--z-base': '0',
      '--z-raised': '10',
      '--z-grid-item-active': '20',
      '--z-rail': '30',
      '--z-overlay': '40',
      '--z-modal': '50',
      '--z-toast': '60',
    };
    for (const [name, value] of Object.entries(expected)) {
      expect(declaredValue(CSS, name), name).toBe(value);
    }
  });

  it('тайминги не превышают 250 ms (правило 19)', () => {
    // Считаются уникальные имена, а не совпадения: блок prefers-reduced-motion
    // объявляет те же три имени как 1ms, поэтому совпадений всегда шесть.
    const matches = [...CSS.matchAll(/(--duration-[a-z]+)\s*:\s*(\d+)ms/g)];
    const names = new Set(matches.map((m) => m[1]));
    expect(names.size).toBe(3);
    for (const [, name, value] of matches) {
      expect(Number(value), name).toBeLessThanOrEqual(250);
    }
  });

  it('радиусы объявлены только через @theme inline и ссылаются на слой темы', () => {
    const theme = block('@theme inline');
    for (const step of ['xs', 'sm', 'md', 'lg', 'xl']) {
      expect(declaredValue(theme, `--radius-${step}`)).toBe(`var(--dashflow-radius-${step})`);
    }
    // Ключевая защита: --radius-* в обычном :root возвращает коллизию с
    // дефолтами Tailwind, из-за которой rounded-md молча становился 14px.
    const roots = [...CSS.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]).join('\n');
    expect(roots).not.toMatch(/--radius-(xs|sm|md|lg|xl|2xl|full)\s*:/);
  });

  it('внешние радиусы Tailwind вне шкалы удалены', () => {
    const theme = block('@theme inline');
    expect(declaredValue(theme, '--radius-3xl')).toBe('initial');
    expect(declaredValue(theme, '--radius-4xl')).toBe('initial');
  });

  it('типографическая шкала — 12/13/14/16/20/24/32/48/64 px с межстрочными', () => {
    const theme = block('@theme {');
    const expected: Record<string, [string, string]> = {
      '--text-xs': ['0.75rem', '1rem'],
      '--text-13': ['0.8125rem', '1.125rem'],
      '--text-sm': ['0.875rem', '1.25rem'],
      '--text-base': ['1rem', '1.5rem'],
      '--text-xl': ['1.25rem', '1.75rem'],
      '--text-2xl': ['1.5rem', '2rem'],
      '--text-display-sm': ['2rem', '2.5rem'],
      '--text-display-md': ['3rem', '3.25rem'],
      '--text-display-lg': ['4rem', '4.25rem'],
    };
    for (const [name, [size, lineHeight]] of Object.entries(expected)) {
      expect(declaredValue(theme, name), name).toBe(size);
      expect(declaredValue(theme, `${name}--line-height`), `${name} line-height`).toBe(lineHeight);
    }
    expect(declaredValue(theme, '--text-lg')).toBe('initial');
  });

  it('каждый цвет Tailwind ссылается на слой темы, а не на литерал', () => {
    const theme = block('@theme inline');
    const colors = [...theme.matchAll(/(--color-[a-z-]+)\s*:\s*([^;]+);/g)];
    expect(colors.length).toBeGreaterThanOrEqual(18);
    for (const [, name, value] of colors) {
      expect(value.trim(), name).toMatch(/^var\(--dashflow-[a-z0-9-]+\)$/);
    }
  });

  it('каждый псевдоним старого имени ссылается на существующую переменную темы', () => {
    const aliases = [
      ...CSS.matchAll(
        /(--(?:color|glass|shadow|font-family)-[a-z-]+)\s*:\s*var\((--dashflow-[a-z0-9-]+)\)/g,
      ),
    ];
    expect(aliases.length).toBeGreaterThanOrEqual(20);
    for (const [, alias, target] of aliases) {
      expect(declaredValue(CSS, target), `${alias} → ${target}`).toBeDefined();
    }
  });

  it('есть выключатель анимаций для prefers-reduced-motion (правило 19)', () => {
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('анимации оверлеев объявлены как настоящие токены и имеют @keyframes', () => {
    const theme = block('@theme inline');
    for (const name of ['fade-in', 'scale-in', 'slide-in-right', 'slide-in-up']) {
      expect(declaredValue(theme, `--animate-${name}`), name).toContain(name);
      expect(CSS, `@keyframes ${name}`).toMatch(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
    }
  });
});
