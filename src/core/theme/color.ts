/**
 * Цветовая математика движка тем. Чистый модуль: без DOM, без зависимостей.
 *
 * Единственная точка разбора строк — parseColor. Остальные функции принимают
 * уже разобранный Rgba, поэтому вызывающий код проверяет ввод один раз и целиком,
 * а не подставляет заглушки по одному значению.
 */

/** Цвет в sRGB. Каналы 0–255, альфа 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3,8})$/i;
const RGB_PATTERN = /^rgba?\(([^()]*)\)$/i;

/** Ограничивает значение отрезком [min, max]. NaN превращается в min. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Удваивает символы короткой hex-записи: 'f0a' → 'ff00aa'. */
function expandShortHex(digits: string): string {
  let expanded = '';
  for (const digit of digits) expanded += digit + digit;
  return expanded;
}

function parseHex(input: string): Rgba | null {
  const match = HEX_PATTERN.exec(input);
  if (match === null) return null;

  const digits = match[1];
  const full = digits.length === 3 || digits.length === 4 ? expandShortHex(digits) : digits;
  if (full.length !== 6 && full.length !== 8) return null;

  const channel = (offset: number): number => parseInt(full.slice(offset, offset + 2), 16);
  const alpha = full.length === 8 ? channel(6) / 255 : 1;
  return { r: channel(0), g: channel(2), b: channel(4), a: alpha };
}

/** Разбирает один компонент rgb(): число либо процент. NaN на нечисловом вводе. */
function parseComponent(token: string, scale: number): number {
  const trimmed = token.trim();
  if (trimmed === '') return Number.NaN;
  if (trimmed.endsWith('%')) {
    const percent = Number(trimmed.slice(0, -1));
    return Number.isNaN(percent) ? Number.NaN : (percent / 100) * scale;
  }
  return Number(trimmed);
}

function parseRgb(input: string): Rgba | null {
  const match = RGB_PATTERN.exec(input);
  if (match === null) return null;

  const body = match[1].trim();
  const [channelPart, alphaPart] = body.includes('/') ? body.split('/') : [body, undefined];
  const channels = channelPart
    .trim()
    .split(/[\s,]+/)
    .filter((token) => token !== '');

  // Форма rgba(r, g, b, a) кладёт альфу четвёртым токеном, а не за слешем.
  const rawAlpha = alphaPart ?? (channels.length === 4 ? channels.pop() : undefined);
  if (channels.length !== 3) return null;

  const rgb = channels.map((token) => parseComponent(token, 255));
  if (rgb.some((value) => Number.isNaN(value))) return null;

  const alpha = rawAlpha === undefined ? 1 : parseComponent(rawAlpha, 1);
  if (Number.isNaN(alpha)) return null;

  return {
    r: clamp(Math.round(rgb[0]), 0, 255),
    g: clamp(Math.round(rgb[1]), 0, 255),
    b: clamp(Math.round(rgb[2]), 0, 255),
    a: clamp(alpha, 0, 1),
  };
}

/**
 * Разбирает CSS-цвет. Поддерживаются #rgb, #rgba, #rrggbb, #rrggbbaa,
 * rgb()/rgba() в запятой, пробельной и слеш-форме, каналы и альфа в процентах.
 * Именованные цвета не поддерживаются намеренно: редактор тем всегда даёт hex.
 * Возвращает null на любом другом вводе — вызывающий код обязан это обработать.
 */
export function parseColor(input: string): Rgba | null {
  const normalized = input.trim();
  if (normalized === '') return null;
  return normalized.startsWith('#') ? parseHex(normalized) : parseRgb(normalized.toLowerCase());
}

/** Печатает цвет в современном CSS-синтаксисе. Альфа опускается, если она равна 1. */
export function formatColor(color: Rgba): string {
  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);
  if (color.a >= 1) return `rgb(${r} ${g} ${b})`;
  const alpha = Number(color.a.toFixed(3));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

/** Возвращает копию цвета с другой альфой. */
export function withAlpha(color: Rgba, alpha: number): Rgba {
  return { r: color.r, g: color.g, b: color.b, a: clamp(alpha, 0, 1) };
}

/** Линейно смешивает два цвета. weight = 0 даёт a, weight = 1 даёт b. */
export function mix(a: Rgba, b: Rgba, weight: number): Rgba {
  const t = clamp(weight, 0, 1);
  const blend = (from: number, to: number): number => Math.round(from + (to - from) * t);
  return {
    r: blend(a.r, b.r),
    g: blend(a.g, b.g),
    b: blend(a.b, b.b),
    a: a.a + (b.a - a.a) * t,
  };
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

/** Осветляет цвет, сдвигая его к белому. Альфа сохраняется. */
export function lighten(color: Rgba, amount: number): Rgba {
  return withAlpha(mix(color, WHITE, amount), color.a);
}

/** Затемняет цвет, сдвигая его к чёрному. Альфа сохраняется. */
export function darken(color: Rgba, amount: number): Rgba {
  return withAlpha(mix(color, BLACK, amount), color.a);
}

/**
 * Накладывает полупрозрачный цвет на непрозрачный фон и возвращает результат.
 * Нужен для измерения контраста на стеклянных поверхностях: контраст определён
 * только для непрозрачных пар.
 */
export function flatten(fore: Rgba, back: Rgba): Rgba {
  return withAlpha(mix(back, fore, fore.a), 1);
}

/** Переводит канал sRGB в линейное пространство по формуле WCAG 2.1. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Относительная яркость по WCAG 2.1. Белый даёт 1, чёрный — 0. Альфа игнорируется. */
export function relativeLuminance(color: Rgba): number {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

/** Коэффициент контраста по WCAG 2.1: от 1 (одинаковые) до 21 (белый и чёрный). */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Выбирает кандидата с наибольшим контрастом к фону. При равенстве побеждает
 * тот, кто идёт раньше в списке, поэтому порядок кандидатов задаёт предпочтение.
 */
export function pickReadable(background: Rgba, candidates: Rgba[]): Rgba {
  const first = candidates[0];
  if (first === undefined) throw new Error('pickReadable: список кандидатов пуст');

  let best = first;
  let bestRatio = contrastRatio(background, first);
  for (const candidate of candidates.slice(1)) {
    const ratio = contrastRatio(background, candidate);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
}
