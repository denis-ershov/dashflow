import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StorageAdapter } from '@/services/storage/StorageAdapter';
import { SupportedLanguage, detectBrowserLanguage } from '@/services/localization/i18n';

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
      const savedLang = await StorageAdapter.get<SupportedLanguage>('app_language', detectBrowserLanguage());
      const savedTheme = await StorageAdapter.get<ThemeMode>('app_theme', 'dark');
      const savedAnim = await StorageAdapter.get<boolean>('app_animations', true);

      set((state) => {
        state.language = savedLang;
        state.theme = savedTheme;
        state.animationsEnabled = savedAnim;
        state.isInitialized = true;
      });

      // Применение темы к документ-элементу
      document.documentElement.setAttribute('data-theme', savedTheme);
    },

    setLanguage: async (lang) => {
      set((state) => {
        state.language = lang;
      });
      await StorageAdapter.set('app_language', lang);
    },

    setTheme: async (theme) => {
      set((state) => {
        state.theme = theme;
      });
      document.documentElement.setAttribute('data-theme', theme);
      await StorageAdapter.set('app_theme', theme);
    },

    setAnimationsEnabled: async (enabled) => {
      set((state) => {
        state.animationsEnabled = enabled;
      });
      await StorageAdapter.set('app_animations', enabled);
    },
  }))
);
