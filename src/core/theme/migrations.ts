/**
 * Модуль версионирования и миграции состояния темы.
 * Чистые функции без DOM и сайд-эффектов.
 *
 * v1: разрозненные ключи theme_active_id, theme_colors, theme_bg, theme_custom_css.
 * v2: единое типизированное состояние с версионированием и валидацией.
 *
 * Главное правило миграции: default-dark переименовывается в deep-blue,
 * чтобы существующие пользователи не теряли привычную синюю гамму.
 */

import { DEFAULT_PRESET_ID, findPreset, type PresetId } from './presets';
import { type ThemeTokens } from './tokens';
import { DEFAULT_SCRIM, sanitizeWallpaperUrl, validateScrim } from './wallpaper';
import { validateCustomCss } from './cssValidator';

export const CURRENT_THEME_VERSION = 2;

export interface ThemeStateV2 {
  version: 2;
  activePresetId: PresetId;
  customTokens?: ThemeTokens;
  customCss: string;
  allowExternalCss: boolean;
  wallpaperUrl: string | null;
  scrim: number;
}

export const DEFAULT_THEME_STATE: ThemeStateV2 = {
  version: CURRENT_THEME_VERSION,
  activePresetId: DEFAULT_PRESET_ID,
  customTokens: undefined,
  customCss: '',
  allowExternalCss: false,
  wallpaperUrl: null,
  scrim: DEFAULT_SCRIM,
};

/**
 * Чистая функция миграции произвольного состояния темы к текущей версии v2.
 */
export function migrateThemeState(raw: unknown): ThemeStateV2 {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_THEME_STATE };
  }

  const obj = raw as Record<string, unknown>;

  // Если уже v2
  if (obj.version === CURRENT_THEME_VERSION) {
    const rawPreset =
      typeof obj.activePresetId === 'string' ? obj.activePresetId : DEFAULT_PRESET_ID;
    const preset = findPreset(rawPreset);
    const activePresetId = preset ? preset.id : DEFAULT_PRESET_ID;

    const customCssStr = typeof obj.customCss === 'string' ? obj.customCss : '';
    const allowExternal = obj.allowExternalCss === true;
    const cssValidation = validateCustomCss(customCssStr, { allowExternal });
    const customCss = cssValidation.ok ? cssValidation.css : '';

    const wallpaperUrl = sanitizeWallpaperUrl(obj.wallpaperUrl);
    const scrim = validateScrim(obj.scrim);

    return {
      version: CURRENT_THEME_VERSION,
      activePresetId,
      customTokens:
        typeof obj.customTokens === 'object' && obj.customTokens !== null
          ? (obj.customTokens as ThemeTokens)
          : undefined,
      customCss,
      allowExternalCss: allowExternal,
      wallpaperUrl,
      scrim,
    };
  }

  // Миграция v1 -> v2
  // 1. Определение пресета
  let rawPresetId = (obj.activePresetId ?? obj.theme_active_id ?? obj.active_id) as
    string | undefined;
  if (rawPresetId === 'default-dark') {
    rawPresetId = 'deep-blue';
  }

  let activePresetId: PresetId = DEFAULT_PRESET_ID;
  if (typeof rawPresetId === 'string') {
    const matched = findPreset(rawPresetId);
    if (matched) {
      activePresetId = matched.id;
    }
  }

  // 2. Обои и затемнение (scrim)
  let rawWallpaperUrl: unknown = obj.wallpaperUrl;
  let rawScrim: unknown = obj.scrim;

  if (typeof obj.theme_bg === 'object' && obj.theme_bg !== null) {
    const bgObj = obj.theme_bg as Record<string, unknown>;
    if (bgObj.value !== undefined) {
      rawWallpaperUrl = bgObj.value;
    }
    if (typeof bgObj.brightness === 'number') {
      // В v1 brightness 0.7 означало затемнение 30%
      rawScrim = Math.max(0, Math.min(1, 1 - bgObj.brightness));
    }
  }

  const wallpaperUrl = sanitizeWallpaperUrl(rawWallpaperUrl);
  const scrim = validateScrim(rawScrim);

  // 3. Пользовательский CSS
  const rawCss = obj.customCss ?? obj.theme_custom_css;
  const customCssStr = typeof rawCss === 'string' ? rawCss : '';
  const allowExternal = obj.allowExternalCss === true;
  const cssValidation = validateCustomCss(customCssStr, { allowExternal });
  const customCss = cssValidation.ok ? cssValidation.css : '';

  return {
    version: CURRENT_THEME_VERSION,
    activePresetId,
    customTokens: undefined,
    customCss,
    allowExternalCss: allowExternal,
    wallpaperUrl,
    scrim,
  };
}
