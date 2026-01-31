import { create } from 'zustand';
import type { SettingsState, ThemeMode, ThemeOverrides } from '../types/dashboard';

interface SettingsActions {
  setCloudSync: (cloudSync: Partial<SettingsState['cloudSync']>) => void;
  setLocale: (locale: string) => void;
  setTheme: (theme: ThemeMode) => void;
  setThemeOverrides: (overrides: ThemeOverrides | undefined) => void;
  setGridSettings: (grid: Partial<SettingsState['grid']>) => void;
  hydrate: (settings: Partial<SettingsState>) => void;
  reset: () => void;
}

const defaultSettings: SettingsState = {
  cloudSync: {
    enabled: false,
    lastSyncAt: null,
    conflictResolution: 'local',
  },
  locale: navigator.language.split('-')[0] ?? 'en',
  theme: 'system',
  grid: {
    cols: 12,
    rowHeight: 60,
  },
};

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  ...defaultSettings,

  setCloudSync: (cloudSync) =>
    set((state) => ({
      cloudSync: { ...state.cloudSync, ...cloudSync },
    })),

  setLocale: (locale) => set({ locale }),

  setTheme: (theme) => set({ theme }),

  setThemeOverrides: (themeOverrides) => set({ themeOverrides }),

  setGridSettings: (grid) =>
    set((state) => ({
      grid: { ...state.grid, ...grid },
    })),

  hydrate: (settings) => set((state) => ({ ...state, ...settings })),

  reset: () => set(defaultSettings),
}));
