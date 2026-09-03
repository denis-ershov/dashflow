/**
 * Модуль обработки и валидации обоев (wallpaper) и скрима (scrim).
 * Чистые функции без DOM.
 *
 * Обои не являются частью темы и управляются отдельно.
 * Разрешены только безопасные схемы: https, data, chrome-extension.
 */

/** Разрешённые схемы для фоновых изображений (спека, §6). */
export const ALLOWED_WALLPAPER_SCHEMES = ['https', 'data', 'chrome-extension'] as const;
export type AllowedWallpaperScheme = (typeof ALLOWED_WALLPAPER_SCHEMES)[number];

/** Степень затемнения (scrim) по умолчанию при наличии обоев — 30% (спека, §6). */
export const DEFAULT_SCRIM = 0.3;

/** Запрещённые символы в URL для предотвращения CSS-инъекций. */
const DANGEROUS_CHARS = /["'{}()\r\n\\]/;

/**
 * Проверяет, является ли строка допустимым и безопасным URL для обоев.
 * Разрешены схемы: https, data, chrome-extension.
 * Запрещены неразрешённые схемы, кавычки и управляющие символы CSS.
 */
export function isAllowedWallpaperUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;
  if (DANGEROUS_CHARS.test(trimmed)) return false;

  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!schemeMatch) return false;

  const scheme = schemeMatch[1].toLowerCase();
  if (!ALLOWED_WALLPAPER_SCHEMES.includes(scheme as AllowedWallpaperScheme)) {
    return false;
  }

  // Точка с запятой допустима только в data: URI (например, data:image/png;base64,...)
  if (scheme !== 'data' && trimmed.includes(';')) {
    return false;
  }

  return true;
}

/**
 * Санитизирует URL обоев. Возвращает нормализованную строку или null, если URL небезопасен.
 */
export function sanitizeWallpaperUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return isAllowedWallpaperUrl(trimmed) ? trimmed : null;
}

/**
 * Валидирует значение scrim (коэффициент затемнения от 0 до 1).
 * Если передано некорректное значение, возвращает DEFAULT_SCRIM.
 */
export function validateScrim(scrim: unknown): number {
  if (typeof scrim !== 'number' || !Number.isFinite(scrim)) {
    return DEFAULT_SCRIM;
  }
  return Math.min(1, Math.max(0, scrim));
}

export interface WallpaperStyle {
  bgImage: string;
  scrim: number;
}

/**
 * Формирует значения для CSS-переменных --app-bg-image и --app-scrim.
 * Если URL не задан или невалиден, возвращает { bgImage: 'none', scrim: 0 }.
 */
export function buildWallpaperStyle(
  url: string | null | undefined,
  customScrim?: number,
): WallpaperStyle {
  const safeUrl = sanitizeWallpaperUrl(url);
  if (!safeUrl) {
    return {
      bgImage: 'none',
      scrim: 0,
    };
  }

  const scrim = customScrim !== undefined ? validateScrim(customScrim) : DEFAULT_SCRIM;
  return {
    bgImage: `url("${safeUrl}")`,
    scrim,
  };
}
