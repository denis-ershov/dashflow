import { describe, expect, it } from 'vitest';
import { contrastRatio, formatColor, relativeLuminance } from '@/core/theme/color';
import {
  buildThemeCss,
  COLOR_KEYS,
  RADIUS_SCALES,
  resolveTheme,
  themeCssVarName,
  type ColorKey,
  type ResolvedTheme,
  type ThemeTokens,
} from '@/core/theme/tokens';

/** Семь обязательных ключей — минимум, на котором тема обязана собраться. */
const BASE: ThemeTokens = {
  canvas: '#0b0f17',
  surface: 'rgb(18 26 38 / 0.7)',
  primary: '#3b82f6',
  secondary: '#06b6d4',
  accent: '#8b5cf6',
  fg: '#f8fafc',
  line: 'rgb(255 255 255 / 0.08)',
};

function resolve(patch: Partial<ThemeTokens> = {}): ResolvedTheme {
  const theme = resolveTheme({ ...BASE, ...patch });
  if (theme === null) throw new Error('resolveTheme неожидаемо вернул null');
  return theme;
}

/**
 * Тема приходит из chrome.storage, где типов нет. Помощник моделирует именно
 * это: значения любого типа поверх обязательных ключей. Приведение не нужно —
 * spread нетипизированной записи поверх ThemeTokens остаётся совместимым по
 * типам, а несоответствие обязана поймать сама resolveTheme во время выполнения.
 */
function resolveRaw(patch: Record<string, unknown>): ResolvedTheme | null {
  return resolveTheme({ ...BASE, ...patch });
}

/** Разбирает напечатанный CSS в карту «имя переменной → значение». */
function declarations(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of source.split('\n')) {
    const match = /^\s*(--dashflow-[a-z0-9-]+):\s*(.+);$/.exec(line);
    if (match !== null) map.set(match[1], match[2]);
  }
  return map;
}

describe('COLOR_KEYS', () => {
  it('содержит 24 ключа', () => {
    expect(COLOR_KEYS).toHaveLength(24);
  });

  it('не содержит повторов', () => {
    expect(new Set(COLOR_KEYS).size).toBe(COLOR_KEYS.length);
  });
});

describe('resolveTheme — обязательные ключи', () => {
  it('собирает полную тему из семи ключей', () => {
    expect(Object.keys(resolve().colors)).toHaveLength(24);
  });

  it.each(['canvas', 'surface', 'primary', 'secondary', 'accent', 'fg', 'line'])(
    'отклоняет набор без ключа %s',
    (key) => {
      expect(resolveRaw({ [key]: undefined })).toBeNull();
    },
  );

  it('отклоняет набор с неразбираемым цветом', () => {
    expect(resolveRaw({ primary: 'не цвет' })).toBeNull();
  });

  it('отклоняет нестроковый цвет', () => {
    expect(resolveRaw({ primary: 42 })).toBeNull();
  });
});

describe('resolveTheme — вывод оттенков', () => {
  it('осветляет surface для наведения', () => {
    expect(resolve().colors.surfaceHover).toEqual({ r: 37, g: 44, b: 55, a: 0.7 });
  });

  it('осветляет surface сильнее для нажатия', () => {
    expect(resolve().colors.surfaceActive).toEqual({ r: 56, g: 63, b: 73, a: 0.7 });
  });

  it('отдаёт приоритет авторскому surfaceHover', () => {
    expect(resolve({ surfaceHover: '#123456' }).colors.surfaceHover).toEqual({
      r: 18,
      g: 52,
      b: 86,
      a: 1,
    });
  });

  it('выбирает тёмный текст на синей заливке', () => {
    const theme = resolve();
    expect(theme.colors.primaryFg).toEqual(theme.colors.canvas);
  });

  it('держит контраст текста на заливке не ниже 4.5:1', () => {
    const theme = resolve();
    expect(contrastRatio(theme.colors.primary, theme.colors.primaryFg)).toBeGreaterThanOrEqual(4.5);
  });

  it('располагает приглушённые оттенки между fg и canvas', () => {
    const { canvas, fg, fgMuted, fgDim } = resolve().colors;
    const l = (color: typeof canvas): number => relativeLuminance(color);
    expect(l(canvas)).toBeLessThan(l(fgDim));
    expect(l(fgDim)).toBeLessThan(l(fgMuted));
    expect(l(fgMuted)).toBeLessThan(l(fg));
  });

  it('усиливает альфу линии при наведении', () => {
    expect(resolve().colors.lineHover.a).toBeCloseTo(0.2, 10);
  });

  it('не выводит альфу линии за единицу', () => {
    expect(resolve({ line: 'rgb(255 255 255 / 0.5)' }).colors.lineHover.a).toBe(1);
  });

  it('строит стекло из surface с прозрачностью темы', () => {
    const theme = resolve();
    expect(theme.colors.glassBg).toEqual({ ...theme.colors.surface, a: 0.65 });
  });

  it('следует за изменением glassOpacity', () => {
    expect(resolve({ glassOpacity: 0.4 }).colors.glassBg.a).toBe(0.4);
  });

  it('строит границу стекла из fg', () => {
    expect(resolve().colors.glassBorder).toEqual({ r: 248, g: 250, b: 252, a: 0.1 });
  });

  it('выводит свечения из primary', () => {
    const { primaryGlow, lineGlow } = resolve().colors;
    expect(primaryGlow).toEqual({ r: 59, g: 130, b: 246, a: 0.35 });
    expect(lineGlow).toEqual({ r: 59, g: 130, b: 246, a: 0.5 });
  });

  it('выводит фоновые пятна из accent и secondary', () => {
    const { ambient1, ambient2 } = resolve().colors;
    expect(ambient1).toEqual({ r: 139, g: 92, b: 246, a: 0.15 });
    expect(ambient2).toEqual({ r: 6, g: 182, b: 212, a: 0.08 });
  });

  it('подставляет статусные цвета по умолчанию', () => {
    const { danger, warning, success, info } = resolve().colors;
    expect(formatColor(danger)).toBe('rgb(239 68 68)');
    expect(formatColor(warning)).toBe('rgb(245 158 11)');
    expect(formatColor(success)).toBe('rgb(16 185 129)');
    expect(formatColor(info)).toBe('rgb(56 189 248)');
  });

  it('отдаёт приоритет авторскому статусному цвету', () => {
    expect(resolve({ danger: '#ff0000' }).colors.danger).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
});

describe('resolveTheme — скаляры', () => {
  it('подставляет дефолты скаляров', () => {
    const theme = resolve();
    expect(theme.glassBlur).toBe('24px');
    expect(theme.glassOpacity).toBe(0.65);
    expect(theme.fontScale).toBe(1);
    expect(theme.radius).toEqual(RADIUS_SCALES.soft);
  });

  it('принимает корректную длину размытия', () => {
    expect(resolve({ glassBlur: '12px' }).glassBlur).toBe('12px');
  });

  it.each(['12', '12em', 'calc(1px)', '24px; } * { color: red', '1000px'])(
    'отклоняет размытие %s',
    (value) => {
      expect(resolveRaw({ glassBlur: value })).toBeNull();
    },
  );

  it('принимает прозрачность в диапазоне', () => {
    expect(resolve({ glassOpacity: 0.4 }).glassOpacity).toBe(0.4);
  });

  it.each([1.5, -0.1, Number.NaN, '0.5'])('отклоняет прозрачность %s', (value) => {
    expect(resolveRaw({ glassOpacity: value })).toBeNull();
  });

  it('принимает масштаб шрифта в диапазоне', () => {
    expect(resolve({ fontScale: 1.25 }).fontScale).toBe(1.25);
  });

  it.each([0.5, 2, Number.NaN])('отклоняет масштаб шрифта %s', (value) => {
    expect(resolveRaw({ fontScale: value })).toBeNull();
  });

  it('разворачивает имя шкалы радиусов в саму шкалу', () => {
    expect(resolve({ radius: 'sharp' }).radius).toEqual(RADIUS_SCALES.sharp);
  });

  it('отклоняет неизвестную шкалу радиусов', () => {
    expect(resolveRaw({ radius: 'huge' })).toBeNull();
  });

  it('принимает список шрифтов', () => {
    const fontSans = "Inter, 'Segoe UI', sans-serif";
    expect(resolve({ fontSans }).fontSans).toBe(fontSans);
  });

  it.each(['Inter; } body { display: none', 'url(https://evil.example/x)', 'Inter{}', '', 123])(
    'отклоняет небезопасный шрифт %s',
    (value) => {
      expect(resolveRaw({ fontSans: value })).toBeNull();
    },
  );
});

describe('themeCssVarName', () => {
  it.each([
    ['canvas', '--dashflow-canvas'],
    ['surfaceHover', '--dashflow-surface-hover'],
    ['primaryFg', '--dashflow-primary-fg'],
    ['glassBg', '--dashflow-glass-bg'],
    ['ambient1', '--dashflow-ambient-1'],
  ] as [ColorKey, string][])('превращает %s в %s', (key, expected) => {
    expect(themeCssVarName(key)).toBe(expected);
  });
});

describe('buildThemeCss', () => {
  it('оборачивает объявления в :root', () => {
    const css = buildThemeCss(resolve());
    expect(css.startsWith(':root {\n')).toBe(true);
    expect(css.endsWith('}\n')).toBe(true);
  });

  it('печатает 34 объявления', () => {
    expect(declarations(buildThemeCss(resolve())).size).toBe(34);
  });

  it('печатает все цветовые ключи', () => {
    const printed = declarations(buildThemeCss(resolve()));
    for (const key of COLOR_KEYS) {
      expect(printed.has(themeCssVarName(key))).toBe(true);
    }
  });

  it('нормализует hex в современный rgb()', () => {
    const printed = declarations(buildThemeCss(resolve()));
    expect(printed.get('--dashflow-canvas')).toBe('rgb(11 15 23)');
  });

  it('сохраняет альфу при печати', () => {
    const printed = declarations(buildThemeCss(resolve()));
    expect(printed.get('--dashflow-surface')).toBe('rgb(18 26 38 / 0.7)');
  });

  it('печатает выбранную шкалу радиусов', () => {
    const printed = declarations(buildThemeCss(resolve({ radius: 'sharp' })));
    expect(printed.get('--dashflow-radius-xs')).toBe('2px');
    expect(printed.get('--dashflow-radius-xl')).toBe('14px');
  });

  it('печатает шрифты, размытие и масштаб', () => {
    const printed = declarations(buildThemeCss(resolve({ fontScale: 1.25 })));
    expect(printed.get('--dashflow-glass-blur')).toBe('24px');
    expect(printed.get('--dashflow-font-scale')).toBe('1.25');
    expect(printed.get('--dashflow-font-sans')).toContain('system-ui');
    expect(printed.get('--dashflow-font-mono')).toContain('ui-monospace');
  });

  it('не печатает ничего сверх контракта', () => {
    const printed = declarations(buildThemeCss(resolve()));
    const expected = [
      ...COLOR_KEYS.map(themeCssVarName),
      '--dashflow-glass-blur',
      '--dashflow-glass-opacity',
      '--dashflow-radius-xs',
      '--dashflow-radius-sm',
      '--dashflow-radius-md',
      '--dashflow-radius-lg',
      '--dashflow-radius-xl',
      '--dashflow-font-sans',
      '--dashflow-font-mono',
      '--dashflow-font-scale',
    ];
    expect([...printed.keys()].sort()).toEqual([...expected].sort());
  });
});
