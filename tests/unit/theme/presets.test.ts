import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio, flatten, parseColor, type Rgba } from '@/core/theme/color';
import { buildThemeCss, resolveTheme, COLOR_KEYS, type ResolvedTheme } from '@/core/theme/tokens';
import { DEFAULT_PRESET_ID, findPreset, PRESETS, type PresetId } from '@/core/theme/presets';

/** Все девять id в порядке, зафиксированном спекой (§«Палитра по умолчанию и пресеты»). */
const ORDER: PresetId[] = [
  'neutral-dark',
  'deep-blue',
  'default-light',
  'midnight',
  'ocean',
  'minimal',
  'aurora',
  'glass',
  'high-contrast',
];

/** Разрешает пресет по id. null в тесте — это баг пресета, а не ветка данных. */
function resolvedById(id: PresetId): ResolvedTheme {
  const preset = findPreset(id);
  if (preset === null) throw new Error(`пресет ${id} не найден`);
  const theme = resolveTheme(preset.tokens);
  if (theme === null) throw new Error(`пресет ${id} не разрешился`);
  return theme;
}

/** Постоянные фоны: на них текст живёт всё время. glassBg сплющивается на canvas. */
function resting(theme: ResolvedTheme): Record<string, Rgba> {
  const c = theme.colors;
  return {
    canvas: c.canvas,
    surface: flatten(c.surface, c.canvas),
    glass: flatten(c.glassBg, c.canvas),
  };
}

/** Транзитные фоны: наведение и нажатие, видны доли секунды. */
function transient(theme: ResolvedTheme): Record<string, Rgba> {
  const c = theme.colors;
  return { hover: flatten(c.surfaceHover, c.canvas), active: flatten(c.surfaceActive, c.canvas) };
}

/** Минимальный контраст цвета по набору фонов. */
function minOver(color: Rgba, set: Record<string, Rgba>): number {
  return Math.min(...Object.values(set).map((bg) => contrastRatio(color, bg)));
}

const CSS = readFileSync(resolve(__dirname, '../../../src/styles/tokens.css'), 'utf8');

/**
 * Якорь слоя 2. Комментарии в tokens.css набраны рамочными символами, поэтому
 * искать нужно именно «── Слой 2»: подстрока «Слой 2» встречается раньше в
 * шапке файла прозой, и якорь по ней указал бы на первый следующий блок — слой 1.
 */
const LAYER_TWO_ANCHOR = '── Слой 2';

/**
 * Тело первого блока после якоря. Логика та же, что в задаче 3, но ошибку
 * бросает Error, а не expect: хелпер вызывается в модульной области, а expect
 * вне теста Vitest сообщает о провале невнятно.
 */
function block(header: string): string {
  const start = CSS.indexOf(header);
  if (start < 0) throw new Error(`блок «${header}» не найден`);
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

/** Карта «--dashflow-имя → значение» из тела блока; переносы строк схлопнуты. */
function dashflowDeclarations(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of source.matchAll(/(--dashflow-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1], match[2].replace(/\s+/g, ' ').trim());
  }
  return map;
}

describe('PRESETS — состав и порядок', () => {
  it('содержит девять пресетов', () => {
    expect(PRESETS).toHaveLength(9);
  });

  it('id не повторяются', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('порядок совпадает со спекой', () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(ORDER);
  });

  it('пресет по умолчанию — neutral-dark', () => {
    expect(DEFAULT_PRESET_ID).toBe('neutral-dark');
  });

  it.each(ORDER)('%s несёт только id и tokens', (id) => {
    const preset = findPreset(id);
    expect(preset === null ? [] : Object.keys(preset).sort()).toEqual(['id', 'tokens']);
  });
});

describe('findPreset', () => {
  it.each(ORDER)('находит %s', (id) => {
    expect(findPreset(id)?.id).toBe(id);
  });

  it.each(['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'нет такого'])(
    'возвращает null на %s',
    (key) => {
      expect(findPreset(key)).toBeNull();
    },
  );
});

describe('resolveTheme — полнота', () => {
  it.each(ORDER)('%s разрешается в двадцать четыре цвета', (id) => {
    expect(Object.keys(resolvedById(id).colors)).toHaveLength(24);
  });
});

describe('контраст — постоянные и транзитные фоны', () => {
  /** Порог приглушённого и тусклого текста: доступный режим держит AAA. */
  const tierNeed = (id: PresetId): number => (id === 'high-contrast' ? 7 : 4.5);

  it.each(ORDER)('%s: основной текст на постоянных фонах ≥ 7:1', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fg, resting(theme))).toBeGreaterThanOrEqual(7);
  });

  it.each(ORDER)('%s: основной текст на транзитных фонах ≥ 4.5:1', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fg, transient(theme))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(ORDER)('%s: приглушённый текст на постоянных фонах в норме уровня', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fgMuted, resting(theme))).toBeGreaterThanOrEqual(tierNeed(id));
  });

  it.each(ORDER)('%s: приглушённый текст на транзитных фонах ≥ 3:1', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fgMuted, transient(theme))).toBeGreaterThanOrEqual(3);
  });

  it.each(ORDER)('%s: тусклый текст на постоянных фонах в норме уровня', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fgDim, resting(theme))).toBeGreaterThanOrEqual(tierNeed(id));
  });

  it.each(ORDER)('%s: тусклый текст на транзитных фонах ≥ 3:1', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fgDim, transient(theme))).toBeGreaterThanOrEqual(3);
  });

  it.each(ORDER)('%s: текст на заливке primary в норме уровня', (id) => {
    const theme = resolvedById(id);
    expect(contrastRatio(theme.colors.primaryFg, theme.colors.primary)).toBeGreaterThanOrEqual(
      tierNeed(id),
    );
  });
});

describe('иерархия текста', () => {
  it.each(ORDER)('%s: контраст к холсту падает от fg к fgMuted и к fgDim', (id) => {
    const c = resolvedById(id).colors;
    // Мерить контрастом к холсту, а не яркостью: в светлой теме fg темнее
    // холста и порядок яркости переворачивается. Контраст монотонен всегда.
    const toCanvas = (color: Rgba): number => contrastRatio(color, c.canvas);
    expect(toCanvas(c.fg)).toBeGreaterThan(toCanvas(c.fgMuted));
    expect(toCanvas(c.fgMuted)).toBeGreaterThan(toCanvas(c.fgDim));
  });
});

describe('High Contrast', () => {
  it('задаёт чёрный текст на жёлтой заливке явно', () => {
    expect(findPreset('high-contrast')?.tokens.primaryFg).toBe('#000000');
  });

  it('выключает стекло: размытие 0px, прозрачность 0.9', () => {
    const theme = resolvedById('high-contrast');
    expect(theme.glassBlur).toBe('0px');
    expect(theme.glassOpacity).toBe(0.9);
  });

  it('держит контраст текста ко всем фонам не ниже 4.5:1 (правило 16)', () => {
    const theme = resolvedById('high-contrast');
    const all = { ...resting(theme), ...transient(theme) };
    for (const tier of [theme.colors.fg, theme.colors.fgMuted, theme.colors.fgDim]) {
      expect(minOver(tier, all)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('tokens.css совпадает с пресетом по умолчанию', () => {
  const layerTwo = block(LAYER_TWO_ANCHOR);
  const authored = dashflowDeclarations(layerTwo);
  const printed = dashflowDeclarations(buildThemeCss(resolvedById(DEFAULT_PRESET_ID)));

  it('слой 2 объявляет все двадцать четыре цвета плюс десять скаляров', () => {
    expect(authored.size).toBe(COLOR_KEYS.length + 10);
  });

  it('имена в слое 2 совпадают с печатью neutral-dark', () => {
    expect([...authored.keys()].sort()).toEqual([...printed.keys()].sort());
  });

  it('каждое значение слоя 2 равно печати neutral-dark', () => {
    for (const [name, expected] of printed) {
      const actual = authored.get(name);
      const printedColor = parseColor(expected);
      const authoredColor = actual === undefined ? null : parseColor(actual);
      if (printedColor !== null && authoredColor !== null) {
        expect(authoredColor, name).toEqual(printedColor);
      } else {
        expect(actual, name).toBe(expected);
      }
    }
  });
});
