import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StorageAdapter } from '@/services/storage/StorageAdapter';
import { type SupportedLanguage, useI18nStore, detectBrowserLanguage } from '@/core/i18n';
import { useThemeStore } from '@/core/theme/themeStore';

export type ThemeMode = 'dark' | 'light' | 'custom';

interface AppState {
  language: SupportedLanguage;
  theme: ThemeMode;
  animationsEnabled: boolean;
  isInitialized: boolean;

  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setAnimationsEnabled: (enabled: boolean) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    language: 'ru',
    theme: 'dark',
    animationsEnabled: true,
    isInitialized: false,

    initialize: async () => {
      const i18nLang = useI18nStore.getState().language;
      const savedLang = await StorageAdapter.get<SupportedLanguage>(
        'app_language',
        i18nLang || detectBrowserLanguage(),
      );
      const savedTheme = await StorageAdapter.get<ThemeMode>('app_theme', 'dark');
      const savedAnim = await StorageAdapter.get<boolean>('app_animations', true);

      set((state) => {
        state.language = savedLang;
        state.theme = savedTheme;
        state.animationsEnabled = savedAnim;
        state.isInitialized = true;
      });

      // Синхронизация с центральным хранилищем i18n
      if (useI18nStore.getState().language !== savedLang) {
        useI18nStore.getState().setLanguage(savedLang);
      }
    },

    setLanguage: async (lang) => {
      set((state) => {
        state.language = lang;
      });
      useI18nStore.getState().setLanguage(lang);
      await StorageAdapter.set('app_language', lang);
    },

    setTheme: async (theme) => {
      set((state) => {
        state.theme = theme;
      });
      await StorageAdapter.set('app_theme', theme);

      // Синхронизация с Theme Engine
      if (theme === 'light') {
        useThemeStore.getState().setPreset('default-light');
      } else if (theme === 'dark') {
        useThemeStore.getState().setPreset('neutral-dark');
      }
    },

    setAnimationsEnabled: async (enabled) => {
      set((state) => {
        state.animationsEnabled = enabled;
      });
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
