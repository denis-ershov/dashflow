/**
 * Модуль применения темы, пользовательского CSS и обоев к DOM.
 * Единственный модуль темы, который обращается к document и window.
 *
 * Архитектура:
 * 1. Тема монтируется в единственный тег <style id="dashflow-theme">.
 * 2. Пользовательский CSS монтируется в <style id="dashflow-custom-css"> строго после темы.
 * 3. Обои и scrim устанавливаются через CSS-переменные на documentElement.
 */

import { relativeLuminance } from './color';
import { buildThemeCss, resolveTheme, type ThemeTokens } from './tokens';
import { DEFAULT_PRESET_ID, findPreset } from './presets';
import {
  validateCustomCss,
  type CssValidationResult,
  type ValidateCssOptions,
} from './cssValidator';
import { buildWallpaperStyle } from './wallpaper';

export const THEME_STYLE_ID = 'dashflow-theme';
export const CUSTOM_CSS_STYLE_ID = 'dashflow-custom-css';

/**
 * Получает существующий или создаёт новый style-тег в head.
 */
function getOrCreateStyleTag(id: string, insertAfterId?: string): HTMLStyleElement {
  let tag = document.getElementById(id) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;

    if (insertAfterId) {
      const anchor = document.getElementById(insertAfterId);
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(tag, anchor.nextSibling);
        return tag;
      }
    }

    document.head.appendChild(tag);
  }
  return tag;
}

/**
 * Применяет токены темы к DOM.
 * Если токены не проходят валидацию, откатывается на пресет по умолчанию (neutral-dark).
 * Возвращает true, если токены были валидны, или false в случае отката.
 */
export function applyTheme(tokens: ThemeTokens): boolean {
  let resolved = resolveTheme(tokens);
  let isValid = true;

  if (resolved === null) {
    isValid = false;
    const fallbackPreset = findPreset(DEFAULT_PRESET_ID);
    if (!fallbackPreset) {
      throw new Error(`Дефолтный пресет ${DEFAULT_PRESET_ID} не найден`);
    }
    resolved = resolveTheme(fallbackPreset.tokens);
    if (!resolved) {
      throw new Error('Дефолтный пресет не удалось разрешить');
    }
  }

  const css = buildThemeCss(resolved);
  const styleTag = getOrCreateStyleTag(THEME_STYLE_ID);
  styleTag.textContent = css;

  // Определение светлой/тёмной темы по яркости canvas
  const canvasLuminance = relativeLuminance(resolved.colors.canvas);
  const themeMode = canvasLuminance > 0.5 ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', themeMode);

  return isValid;
}

/**
 * Валидирует и применяет пользовательский CSS к DOM.
 * Тег dashflow-custom-css всегда располагается после dashflow-theme.
 */
export function applyCustomCss(css: unknown, options?: ValidateCssOptions): CssValidationResult {
  if (typeof css === 'string' && css.trim() === '') {
    const existing = document.getElementById(CUSTOM_CSS_STYLE_ID);
    if (existing) {
      existing.textContent = '';
    }
    return { ok: true, css: '' };
  }

  const result = validateCustomCss(css, options);
  const styleTag = getOrCreateStyleTag(CUSTOM_CSS_STYLE_ID, THEME_STYLE_ID);

  if (result.ok) {
    styleTag.textContent = result.css;
  } else {
    styleTag.textContent = '';
  }

  return result;
}

/**
 * Применяет обои и затемнение (scrim) к documentElement.
 */
export function applyWallpaper(url: string | null | undefined, scrim?: number): void {
  const { bgImage, scrim: finalScrim } = buildWallpaperStyle(url, scrim);
  document.documentElement.style.setProperty('--app-bg-image', bgImage);
  document.documentElement.style.setProperty('--app-scrim', String(finalScrim));
}

export interface FullAppearanceParams {
  theme?: ThemeTokens;
  customCss?: string;
  customCssOptions?: ValidateCssOptions;
  wallpaperUrl?: string | null;
  scrim?: number;
}

/**
 * Применяет полный набор внешнего вида (тема, пользовательский CSS, обои).
 */
export function applyFullAppearance(params: FullAppearanceParams): void {
  if (params.theme) {
    applyTheme(params.theme);
  }
  if (params.customCss !== undefined) {
    applyCustomCss(params.customCss, params.customCssOptions);
  }
  if (params.wallpaperUrl !== undefined || params.scrim !== undefined) {
    applyWallpaper(params.wallpaperUrl, params.scrim);
  }
}

/**
 * Очищает все стили темы и сбрасывает настройки в DOM.
 */
export function clearTheme(): void {
  const themeTag = document.getElementById(THEME_STYLE_ID);
  if (themeTag) themeTag.remove();

  const customTag = document.getElementById(CUSTOM_CSS_STYLE_ID);
  if (customTag) customTag.remove();

  document.documentElement.style.removeProperty('--app-bg-image');
  document.documentElement.style.removeProperty('--app-scrim');
  document.documentElement.removeAttribute('data-theme');
}
