import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StorageAdapter } from '@/core/storage';
import { type SupportedLanguage, useI18nStore, detectBrowserLanguage } from '@/core/i18n';
import { applyDensityPreference, applyMotionPreference, type UiDensity } from '@/core/theme/applyTheme';
import { STORAGE_KEYS } from '@/core/storage/keys';


interface AppState {
  language: SupportedLanguage;
  animationsEnabled: boolean;
  density: UiDensity;
  isInitialized: boolean;

  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  setAnimationsEnabled: (enabled: boolean) => Promise<void>;
  setDensity: (density: UiDensity) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    language: 'ru',
    animationsEnabled: true,
    density: 'comfortable',
    isInitialized: false,

    initialize: async () => {
      const i18nLang = useI18nStore.getState().language;
      const fallbackLang = i18nLang || detectBrowserLanguage();
      let savedLang: SupportedLanguage = fallbackLang;
      let savedAnim = true;
      let savedDensity: UiDensity = 'comfortable';
      let readError: unknown = null;
      try {
        savedLang = await StorageAdapter.get<SupportedLanguage>('app_language', fallbackLang);
        savedAnim = await StorageAdapter.get<boolean>('app_animations', true);
        const storedDensity = await StorageAdapter.get<unknown>(STORAGE_KEYS.APP_DENSITY, 'comfortable');
        savedDensity = storedDensity === 'compact' ? 'compact' : 'comfortable';
      } catch (error) {
        // Интерфейс всё равно запускается на значениях по умолчанию, ошибку получит вызывающий
        readError = error;
      }

      set((state) => {
        state.language = savedLang;
        state.animationsEnabled = savedAnim;
        state.density = savedDensity;
        state.isInitialized = true;
      });
      applyMotionPreference(savedAnim);
      applyDensityPreference(savedDensity);

      // Синхронизация с центральным хранилищем i18n
      if (useI18nStore.getState().language !== savedLang) {
        useI18nStore.getState().setLanguage(savedLang);
      }
      if (readError) {
        throw readError instanceof Error
          ? readError
          : new Error('Settings read failed', { cause: readError });
      }
    },

    setLanguage: async (lang) => {
      set((state) => {
        state.language = lang;
      });
      useI18nStore.getState().setLanguage(lang);
      await StorageAdapter.set('app_language', lang);
    },

    setAnimationsEnabled: async (enabled) => {
      set((state) => {
        state.animationsEnabled = enabled;
      });
      applyMotionPreference(enabled);
      await StorageAdapter.set('app_animations', enabled);
    },

    setDensity: async (density) => {
      set((state) => {
        state.density = density;
      });
      applyDensityPreference(density);
      await StorageAdapter.set(STORAGE_KEYS.APP_DENSITY, density);
    },
  })),
);

// Автоматическая реактивная синхронизация при любом вызове useAppStore.setState
useAppStore.subscribe((state) => {
  if (state.language && useI18nStore.getState().language !== state.language) {
    useI18nStore.getState().setLanguage(state.language);
  }
});
