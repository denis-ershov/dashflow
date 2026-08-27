import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StorageAdapter } from '@/core/storage';
import { detectBrowserLanguage } from './i18n';
import type { SupportedLanguage } from './types';

export interface I18nState {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: detectBrowserLanguage(),
      setLanguage: (language: SupportedLanguage) => set({ language }),
    }),
    {
      name: 'dashflow_i18n_store',
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
    },
  ),
);
