/**
 * Zustand-хранилище состояния темы и внешнего вида.
 * Управляет выбранным пресетом, кастомными токенами, пользовательским CSS, обоями и затемнением.
 *
 * При каждом изменении синхронизирует состояние с DOM через applyFullAppearance.
 */

import { create } from 'zustand';
import { DEFAULT_PRESET_ID, findPreset, type PresetId } from './presets';
import { type ThemeTokens } from './tokens';
import { DEFAULT_SCRIM, validateScrim } from './wallpaper';
import { validateCustomCss, type CssValidationResult } from './cssValidator';
import { applyFullAppearance } from './applyTheme';
import { CURRENT_THEME_VERSION, DEFAULT_THEME_STATE, migrateThemeState } from './migrations';

export interface ThemeStoreState {
  version: 2;
  activePresetId: PresetId;
  customTokens?: ThemeTokens;
  customCss: string;
  allowExternalCss: boolean;
  wallpaperUrl: string | null;
  scrim: number;
  isInitialized: boolean;

  /** Возвращает эффективный набор токенов: кастомные токены, если заданы, иначе токены активного пресета. */
  getEffectiveTokens: () => ThemeTokens;

  /** Устанавливает активный пресет темы и применяет его к DOM. */
  setPreset: (id: PresetId) => void;

  /** Устанавливает пользовательские переопределения токенов. */
  setCustomTokens: (tokens: ThemeTokens | undefined) => void;

  /** Валидирует и устанавливает пользовательский CSS. */
  setCustomCss: (css: string) => CssValidationResult;

  /** Переключает разрешение внешних ресурсов в пользовательском CSS (https). */
  setAllowExternalCss: (allow: boolean) => void;

  /** Устанавливает обои и опциональный скрим. */
  setWallpaper: (url: string | null, scrim?: number) => void;

  /** Устанавливает степень затемнения (scrim). */
  setScrim: (scrim: number) => void;

  /** Сбрасывает тему и внешний вид к значениям по умолчанию. */
  resetTheme: () => void;

  /** Инициализирует состояние из сырых данных (с автоматической миграцией v1 -> v2). */
  initialize: (raw?: unknown) => void;
}

function resolveEffectiveTokens(activePresetId: PresetId, customTokens?: ThemeTokens): ThemeTokens {
  if (customTokens) return customTokens;
  const preset = findPreset(activePresetId) ?? findPreset(DEFAULT_PRESET_ID)!;
  return preset.tokens;
}

function syncToDom(
  activePresetId: PresetId,
  customTokens: ThemeTokens | undefined,
  customCss: string,
  allowExternalCss: boolean,
  wallpaperUrl: string | null,
  scrim: number,
): void {
  const theme = resolveEffectiveTokens(activePresetId, customTokens);
  applyFullAppearance({
    theme,
    customCss,
    customCssOptions: { allowExternal: allowExternalCss },
    wallpaperUrl,
    scrim,
  });
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  version: CURRENT_THEME_VERSION,
  activePresetId: DEFAULT_THEME_STATE.activePresetId,
  customTokens: DEFAULT_THEME_STATE.customTokens,
  customCss: DEFAULT_THEME_STATE.customCss,
  allowExternalCss: DEFAULT_THEME_STATE.allowExternalCss,
  wallpaperUrl: DEFAULT_THEME_STATE.wallpaperUrl,
  scrim: DEFAULT_THEME_STATE.scrim,
  isInitialized: false,

  getEffectiveTokens: () => {
    const { activePresetId, customTokens } = get();
    return resolveEffectiveTokens(activePresetId, customTokens);
  },

  setPreset: (id: PresetId) => {
    const preset = findPreset(id);
    const activePresetId = preset ? preset.id : DEFAULT_PRESET_ID;
    set({ activePresetId });

    const state = get();
    syncToDom(
      activePresetId,
      state.customTokens,
      state.customCss,
      state.allowExternalCss,
      state.wallpaperUrl,
      state.scrim,
    );
  },

  setCustomTokens: (customTokens: ThemeTokens | undefined) => {
    set({ customTokens });

    const state = get();
    syncToDom(
      state.activePresetId,
      customTokens,
      state.customCss,
      state.allowExternalCss,
      state.wallpaperUrl,
      state.scrim,
    );
  },

  setCustomCss: (css: string) => {
    const { allowExternalCss } = get();
    const result = validateCustomCss(css, { allowExternal: allowExternalCss });

    if (result.ok) {
      set({ customCss: result.css });
    } else {
      set({ customCss: '' });
    }

    const state = get();
    syncToDom(
      state.activePresetId,
      state.customTokens,
      state.customCss,
      state.allowExternalCss,
      state.wallpaperUrl,
      state.scrim,
    );

    return result;
  },

  setAllowExternalCss: (allowExternalCss: boolean) => {
    set({ allowExternalCss });

    const state = get();
    const revalidated = validateCustomCss(state.customCss, { allowExternal: allowExternalCss });
    const customCss = revalidated.ok ? revalidated.css : '';
    set({ customCss });

    syncToDom(
      state.activePresetId,
      state.customTokens,
      customCss,
      allowExternalCss,
      state.wallpaperUrl,
      state.scrim,
    );
  },

  setWallpaper: (url: string | null, customScrim?: number) => {
    const scrim = customScrim !== undefined ? validateScrim(customScrim) : get().scrim;
    set({ wallpaperUrl: url, scrim });

    const state = get();
    syncToDom(
      state.activePresetId,
      state.customTokens,
      state.customCss,
      state.allowExternalCss,
      url,
      scrim,
    );
  },

  setScrim: (scrimInput: number) => {
    const scrim = validateScrim(scrimInput);
    set({ scrim });

    const state = get();
    syncToDom(
      state.activePresetId,
      state.customTokens,
      state.customCss,
      state.allowExternalCss,
      state.wallpaperUrl,
      scrim,
    );
  },

  resetTheme: () => {
    set({
      activePresetId: DEFAULT_PRESET_ID,
      customTokens: undefined,
      customCss: '',
      allowExternalCss: false,
      wallpaperUrl: null,
      scrim: DEFAULT_SCRIM,
    });

    syncToDom(
      DEFAULT_PRESET_ID,
      undefined,
      '',
      false,
      null,
      DEFAULT_SCRIM,
    );
  },

  initialize: (raw?: unknown) => {
    const migrated = migrateThemeState(raw);
    set({
      version: CURRENT_THEME_VERSION,
      activePresetId: migrated.activePresetId,
      customTokens: migrated.customTokens,
      customCss: migrated.customCss,
      allowExternalCss: migrated.allowExternalCss,
      wallpaperUrl: migrated.wallpaperUrl,
      scrim: migrated.scrim,
      isInitialized: true,
    });

    syncToDom(
      migrated.activePresetId,
      migrated.customTokens,
      migrated.customCss,
      migrated.allowExternalCss,
      migrated.wallpaperUrl,
      migrated.scrim,
    );
  },
}));
