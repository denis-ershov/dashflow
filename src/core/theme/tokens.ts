/**
 * Контракт темы: описание набора токенов, его проверка, вывод производных
 * оттенков и печать в CSS-переменные.
 *
 * Тема приходит из chrome.storage либо из импортированного пользователем JSON,
 * то есть является недоверенным вводом (правило 32). Каждое значение проходит
 * проверку до попадания в <style>: цвета — через parseColor, длины и шрифты —
 * через allowlist-шаблоны, числа — через диапазон. Символы ';', '{', '}' и
 * последовательность 'url(' не проходят ни через один шаблон, поэтому закрыть
 * объявление и дописать свой селектор через тему невозможно.
 */

import { formatColor, lighten, mix, parseColor, pickReadable, withAlpha, type Rgba } from './color';

/** Цветовые ключи темы. Единственный источник истины для печати и тестов. */
export const COLOR_KEYS = [
  'canvas',
  'surface',
  'surfaceHover',
  'surfaceActive',
  'primary',
  'primaryHover',
  'primaryFg',
  'secondary',
  'accent',
  'fg',
  'fgMuted',
  'fgDim',
  'line',
  'lineHover',
  'danger',
  'warning',
  'success',
  'info',
  'primaryGlow',
  'lineGlow',
  'ambient1',
  'ambient2',
  'glassBg',
  'glassBorder',
] as const;

export type ColorKey = (typeof COLOR_KEYS)[number];

export const RADIUS_STEPS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type RadiusStep = (typeof RADIUS_STEPS)[number];
export type RadiusScale = Record<RadiusStep, string>;

export const RADIUS_SCALE_NAMES = ['sharp', 'soft', 'round'] as const;
export type RadiusScaleName = (typeof RADIUS_SCALE_NAMES)[number];

export const RADIUS_SCALES: Record<RadiusScaleName, RadiusScale> = {
  sharp: { xs: '2px', sm: '4px', md: '6px', lg: '10px', xl: '14px' },
  soft: { xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '28px' },
  round: { xs: '10px', sm: '16px', md: '22px', lg: '30px', xl: '40px' },
};

/** Набор токенов темы: семь ключей обязательны, остальное выводится. */
export interface ThemeTokens {
  canvas: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  fg: string;
  line: string;

  surfaceHover?: string;
  surfaceActive?: string;
  primaryHover?: string;
  primaryFg?: string;
  fgMuted?: string;
  fgDim?: string;
  lineHover?: string;
  danger?: string;
  warning?: string;
  success?: string;
  info?: string;
  primaryGlow?: string;
  lineGlow?: string;
  ambient1?: string;
  ambient2?: string;
  glassBg?: string;
  glassBorder?: string;

  glassBlur?: string;
  glassOpacity?: number;
  radius?: RadiusScaleName;
  fontSans?: string;
  fontMono?: string;
  fontScale?: number;
}

/** Тема после проверки и вывода: готова к печати, без строковых неизвестных. */
export interface ResolvedTheme {
  colors: Record<ColorKey, Rgba>;
  glassBlur: string;
  glassOpacity: number;
  radius: RadiusScale;
  fontSans: string;
  fontMono: string;
  fontScale: number;
}

const DANGER_DEFAULT = '#ef4444';
const WARNING_DEFAULT = '#f59e0b';
const SUCCESS_DEFAULT = '#10b981';
const INFO_DEFAULT = '#38bdf8';

const FONT_SANS_DEFAULT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO_DEFAULT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const LENGTH_PATTERN = /^(?:0|[1-9]\d{0,2})(?:\.\d+)?px$/;
const FONT_PATTERN = /^[A-Za-z0-9\s,'"._-]{1,200}$/;

/**
 * Читает строковый скаляр. Значение попадёт внутрь <style>, поэтому проходит
 * через allowlist: ни ';', ни '{', ни '}', ни 'url(' сквозь шаблон не пройдут.
 */
function readString(value: unknown, pattern: RegExp, fallback: string): string | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !pattern.test(value)) return null;
  return value;
}

function readNumber(value: unknown, min: number, max: number, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

function requireColor(value: string): Rgba {
  const parsed = parseColor(value);
  if (parsed === null) throw new Error(`внутренний дефолт невалиден: ${value}`);
  return parsed;
}

function parseAuthored(tokens: ThemeTokens): Partial<Record<ColorKey, Rgba>> | null {
  const authored: Partial<Record<ColorKey, Rgba>> = {};
  for (const key of COLOR_KEYS) {
    const raw: unknown = tokens[key];
    if (raw === undefined) continue;
    if (typeof raw !== 'string') return null;
    const parsed = parseColor(raw);
    if (parsed === null) return null;
    authored[key] = parsed;
  }
  return authored;
}

function deriveColors(
  authored: Partial<Record<ColorKey, Rgba>>,
  glassOpacity: number,
): Record<ColorKey, Rgba> | null {
  const { canvas, surface, primary, secondary, accent, fg, line } = authored;
  if (
    canvas === undefined ||
    surface === undefined ||
    primary === undefined ||
    secondary === undefined ||
    accent === undefined ||
    fg === undefined ||
    line === undefined
  ) {
    return null;
  }

  return {
    canvas,
    surface,
    surfaceHover: authored.surfaceHover ?? lighten(surface, 0.08),
    surfaceActive: authored.surfaceActive ?? lighten(surface, 0.16),
    primary,
    primaryHover: authored.primaryHover ?? lighten(primary, 0.15),
    primaryFg: authored.primaryFg ?? pickReadable(primary, [fg, canvas]),
    secondary,
    accent,
    fg,
    fgMuted: authored.fgMuted ?? mix(fg, canvas, 0.45),
    fgDim: authored.fgDim ?? mix(fg, canvas, 0.62),
    line,
    lineHover: authored.lineHover ?? withAlpha(line, Math.min(1, line.a * 2.5)),
    danger: authored.danger ?? requireColor(DANGER_DEFAULT),
    warning: authored.warning ?? requireColor(WARNING_DEFAULT),
    success: authored.success ?? requireColor(SUCCESS_DEFAULT),
    info: authored.info ?? requireColor(INFO_DEFAULT),
    primaryGlow: authored.primaryGlow ?? withAlpha(primary, 0.35),
    lineGlow: authored.lineGlow ?? withAlpha(primary, 0.5),
    ambient1: authored.ambient1 ?? withAlpha(accent, 0.15),
    ambient2: authored.ambient2 ?? withAlpha(secondary, 0.08),
    glassBg: authored.glassBg ?? withAlpha(surface, glassOpacity),
    glassBorder: authored.glassBorder ?? withAlpha(fg, 0.1),
  };
}

function resolveScalars(tokens: ThemeTokens): Omit<ResolvedTheme, 'colors'> | null {
  const glassBlur = readString(tokens.glassBlur, LENGTH_PATTERN, '24px');
  const fontSans = readString(tokens.fontSans, FONT_PATTERN, FONT_SANS_DEFAULT);
  const fontMono = readString(tokens.fontMono, FONT_PATTERN, FONT_MONO_DEFAULT);
  const glassOpacity = readNumber(tokens.glassOpacity, 0, 1, 0.65);
  const fontScale = readNumber(tokens.fontScale, 0.75, 1.5, 1);
  const radiusName = tokens.radius ?? 'soft';

  if (glassBlur === null || fontSans === null || fontMono === null) return null;
  if (glassOpacity === null || fontScale === null) return null;
  if (!RADIUS_SCALE_NAMES.includes(radiusName)) return null;

  return {
    glassBlur,
    glassOpacity,
    radius: RADIUS_SCALES[radiusName],
    fontSans,
    fontMono,
    fontScale,
  };
}

/**
 * Приводит набор токенов к полной теме: проверяет скаляры, разбирает авторские
 * цвета и выводит остальные. null означает «набор непригоден целиком» —
 * вызывающий откатывается на пресет по умолчанию, а не подставляет отдельные
 * значения молча. Функция не бросает исключений ни на каком вводе.
 */
export function resolveTheme(tokens: ThemeTokens): ResolvedTheme | null {
  const scalars = resolveScalars(tokens);
  if (scalars === null) return null;

  const authored = parseAuthored(tokens);
  if (authored === null) return null;

  const colors = deriveColors(authored, scalars.glassOpacity);
  if (colors === null) return null;

  return { colors, ...scalars };
}

/** Имя CSS-переменной для цветового ключа: ambient1 → --dashflow-ambient-1. */
export function themeCssVarName(key: ColorKey): string {
  const kebab = key
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/(\d+)/g, '-$1');
  return `--dashflow-${kebab}`;
}

/** Печатает тему как блок :root. Все цвета нормализуются в современный rgb(). */
export function buildThemeCss(theme: ResolvedTheme): string {
  const lines = COLOR_KEYS.map(
    (key) => `  ${themeCssVarName(key)}: ${formatColor(theme.colors[key])};`,
  );
  lines.push(`  --dashflow-glass-blur: ${theme.glassBlur};`);
  lines.push(`  --dashflow-glass-opacity: ${theme.glassOpacity};`);
  for (const step of RADIUS_STEPS) {
    lines.push(`  --dashflow-radius-${step}: ${theme.radius[step]};`);
  }
  lines.push(`  --dashflow-font-sans: ${theme.fontSans};`);
  lines.push(`  --dashflow-font-mono: ${theme.fontMono};`);
  lines.push(`  --dashflow-font-scale: ${theme.fontScale};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
}
