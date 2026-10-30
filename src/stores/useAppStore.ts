import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StorageAdapter } from '@/core/storage';
import { type SupportedLanguage, useI18nStore, detectBrowserLanguage } from '@/core/i18n';
import { applyMotionPreference } from '@/core/theme/applyTheme';


interface AppState {
  language: SupportedLanguage;
  animationsEnabled: boolean;
  isInitialized: boolean;

  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  setAnimationsEnabled: (enabled: boolean) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    language: 'ru',
    animationsEnabled: true,
    isInitialized: false,

    initialize: async () => {
      const i18nLang = useI18nStore.getState().language;
      const fallbackLang = i18nLang || detectBrowserLanguage();
      let savedLang: SupportedLanguage = fallbackLang;
      let savedAnim = true;
      let readError: unknown = null;
      try {
        savedLang = await StorageAdapter.get<SupportedLanguage>('app_language', fallbackLang);
        savedAnim = await StorageAdapter.get<boolean>('app_animations', true);
      } catch (error) {
        // Интерфейс всё равно запускается на значениях по умолчанию, ошибку получит вызывающий
        readError = error;
      }

      set((state) => {
        state.language = savedLang;
        state.animationsEnabled = savedAnim;
        state.isInitialized = true;
      });
      applyMotionPreference(savedAnim);

      // Синхронизация с центральным хранилищем i18n
      if (useI18nStore.getState().language !== savedLang) {
        useI18nStore.getState().setLanguage(savedLang);
      }
      if (readError) throw readError;
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
  })),
);

// Автоматическая реактивная синхронизация при любом вызове useAppStore.setState
useAppStore.subscribe((state) => {
  if (state.language && useI18nStore.getState().language !== state.language) {
    useI18nStore.getState().setLanguage(state.language);
  }
});
