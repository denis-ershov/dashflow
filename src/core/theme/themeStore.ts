/**
 * Zustand-хранилище состояния темы и внешнего вида.
 * Управляет выбранным пресетом, шрифтом, шкалой скруглений, кастомными токенами,
 * пользовательским CSS, обоями и затемнением.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import { DEFAULT_PRESET_ID, findPreset, type PresetId } from './presets';
import { RADIUS_SCALE_NAMES, type RadiusScaleName, type ThemeTokens } from './tokens';
import { DEFAULT_FONT_PRESET_ID, findFontPreset, isFontPresetId, type FontPresetId } from './fonts';
import { DEFAULT_SCRIM, validateScrim } from './wallpaper';
import { validateCustomCss, type CssValidationResult } from './cssValidator';
import { applyFullAppearance } from './applyTheme';
import { CURRENT_THEME_VERSION, DEFAULT_THEME_STATE, migrateThemeState } from './migrations';

export interface ThemeStoreState {
  version: 2;
  activePresetId: PresetId;
  fontPreset: FontPresetId;
  radiusScale: RadiusScaleName;
  customTokens?: ThemeTokens;
  customCss: string;
  allowExternalCss: boolean;
  wallpaperUrl: string | null;
  scrim: number;
  isInitialized: boolean;

  /** Возвращает эффективный набор токенов: кастомные токены, если заданы, иначе токены активного пресета с учётом шрифта и скруглений. */
  getEffectiveTokens: () => ThemeTokens;

  /** Устанавливает активный пресет темы и применяет его к DOM. */
  setPreset: (id: PresetId) => void;

  /** Устанавливает шрифт интерфейса из локального каталога. */
  setFontPreset: (id: FontPresetId) => void;

  /** Устанавливает шкалу скруглений интерфейса (sharp / soft / round). */
  setRadiusScale: (scale: RadiusScaleName) => void;

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

  /** Инициализирует состояние из сырых данных (с автоматической миграцией v1 -> v2) либо применяет текущее. */
  initialize: (raw?: unknown) => void;
}

function resolveEffectiveTokens(
  activePresetId: PresetId,
  fontPreset: FontPresetId,
  radiusScale: RadiusScaleName,
  customTokens?: ThemeTokens,
): ThemeTokens {
  if (customTokens) return customTokens;
  const preset = findPreset(activePresetId) ?? findPreset(DEFAULT_PRESET_ID)!;
  const base = preset.tokens;
  const overrides: Partial<ThemeTokens> = {};
  if (fontPreset !== DEFAULT_FONT_PRESET_ID) {
    overrides.fontSans = findFontPreset(fontPreset).family;
  }
  if (radiusScale !== 'sharp') {
    overrides.radius = radiusScale;
  }
  return Object.keys(overrides).length > 0 ? { ...base, ...overrides } : base;
}

function syncToDom(state: {
  activePresetId: PresetId;
  fontPreset: FontPresetId;
  radiusScale: RadiusScaleName;
  customTokens?: ThemeTokens | undefined;
  customCss: string;
  allowExternalCss: boolean;
  wallpaperUrl: string | null;
  scrim: number;
}): void {
  const theme = resolveEffectiveTokens(
    state.activePresetId,
    state.fontPreset,
    state.radiusScale,
    state.customTokens,
  );
  applyFullAppearance({
    theme,
    customCss: state.customCss,
    customCssOptions: { allowExternal: state.allowExternalCss },
    wallpaperUrl: state.wallpaperUrl,
    scrim: state.scrim,
  });
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      version: CURRENT_THEME_VERSION,
      activePresetId: DEFAULT_THEME_STATE.activePresetId,
      fontPreset: DEFAULT_THEME_STATE.fontPreset,
      radiusScale: DEFAULT_THEME_STATE.radiusScale,
      customTokens: DEFAULT_THEME_STATE.customTokens,
      customCss: DEFAULT_THEME_STATE.customCss,
      allowExternalCss: DEFAULT_THEME_STATE.allowExternalCss,
      wallpaperUrl: DEFAULT_THEME_STATE.wallpaperUrl,
      scrim: DEFAULT_THEME_STATE.scrim,
      isInitialized: false,

      getEffectiveTokens: () => {
        const { activePresetId, fontPreset, radiusScale, customTokens } = get();
        return resolveEffectiveTokens(activePresetId, fontPreset, radiusScale, customTokens);
      },

      setPreset: (id: PresetId) => {
        const preset = findPreset(id);
        const activePresetId = preset ? preset.id : DEFAULT_PRESET_ID;
        set({ activePresetId });
        syncToDom(get());
      },

      setFontPreset: (id: FontPresetId) => {
        const fontPreset = isFontPresetId(id) ? id : DEFAULT_FONT_PRESET_ID;
        set({ fontPreset });
        syncToDom(get());
      },

      setRadiusScale: (scale: RadiusScaleName) => {
        const radiusScale = (RADIUS_SCALE_NAMES as readonly string[]).includes(scale)
          ? scale
          : 'sharp';
        set({ radiusScale });
        syncToDom(get());
      },

      setCustomTokens: (customTokens: ThemeTokens | undefined) => {
        set({ customTokens });
        syncToDom(get());
      },

      setCustomCss: (css: string) => {
        const { allowExternalCss } = get();
        const result = validateCustomCss(css, { allowExternal: allowExternalCss });

        if (result.ok) {
          set({ customCss: result.css });
        } else {
          set({ customCss: '' });
        }

        syncToDom(get());
        return result;
      },

      setAllowExternalCss: (allowExternalCss: boolean) => {
        set({ allowExternalCss });

        const state = get();
        const revalidated = validateCustomCss(state.customCss, { allowExternal: allowExternalCss });
        const customCss = revalidated.ok ? revalidated.css : '';
        set({ customCss });

        syncToDom(get());
      },

      setWallpaper: (url: string | null, customScrim?: number) => {
        const scrim = customScrim !== undefined ? validateScrim(customScrim) : get().scrim;
        set({ wallpaperUrl: url, scrim });
        syncToDom(get());
      },

      setScrim: (scrimInput: number) => {
        const scrim = validateScrim(scrimInput);
        set({ scrim });
        syncToDom(get());
      },

      resetTheme: () => {
        set({
          activePresetId: DEFAULT_PRESET_ID,
          fontPreset: DEFAULT_FONT_PRESET_ID,
          radiusScale: 'sharp',
          customTokens: undefined,
          customCss: '',
          allowExternalCss: false,
          wallpaperUrl: null,
          scrim: DEFAULT_SCRIM,
        });
        syncToDom(get());
      },

      initialize: (raw?: unknown) => {
        if (raw !== undefined) {
          const migrated = migrateThemeState(raw);
          set({
            version: CURRENT_THEME_VERSION,
            activePresetId: migrated.activePresetId,
            fontPreset: migrated.fontPreset,
            radiusScale: migrated.radiusScale,
            customTokens: migrated.customTokens,
            customCss: migrated.customCss,
            allowExternalCss: migrated.allowExternalCss,
            wallpaperUrl: migrated.wallpaperUrl,
            scrim: migrated.scrim,
            isInitialized: true,
          });
          syncToDom(get());
          return;
        }

        set({ isInitialized: true });
        syncToDom(get());
      },
    }),
    {
      name: STORAGE_KEYS.THEME,
      version: CURRENT_THEME_VERSION,
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const val = await StorageAdapter.get(name, null);
          return val ? JSON.stringify(val) : null;
        },
        setItem: async (name, value) => {
          try {
            await StorageAdapter.set(name, JSON.parse(value));
          } catch {
            // Ошибки квот обрабатываются в StorageAdapter
          }
        },
        removeItem: async (name) => {
          await StorageAdapter.remove(name);
        },
      })),
      partialize: (state) => ({
        version: state.version,
        activePresetId: state.activePresetId,
        fontPreset: state.fontPreset,
        radiusScale: state.radiusScale,
        customTokens: state.customTokens,
        customCss: state.customCss,
        allowExternalCss: state.allowExternalCss,
        wallpaperUrl: state.wallpaperUrl,
        scrim: state.scrim,
      }),
      migrate: (persistedState: unknown) => {
        return migrateThemeState(persistedState);
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true;
          syncToDom(state);
        }
      },
    },
  ),
);
