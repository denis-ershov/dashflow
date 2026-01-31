import { browser } from 'wxt/browser';

/**
 * Storage adapter for chrome.storage.local.
 * Abstracts browser API with error handling and optional fallback.
 */

export type StorageArea = 'local' | 'session';

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  getMany<T extends Record<string, unknown>>(
    keys: string[]
  ): Promise<Partial<T>>;
}

function getArea(area: StorageArea = 'local') {
  return area === 'local' ? browser.storage.local : browser.storage.session;
}

export function createStorageAdapter(area: StorageArea = 'local'): StorageAdapter {
  const storage = getArea(area);

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const result = await storage.get(key);
        const value = result[key];
        return value === undefined ? null : (value as T);
      } catch (err) {
        console.warn('[DashFlow] Storage get failed:', key, err);
        return null;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      try {
        await storage.set({ [key]: value });
      } catch (err) {
        console.warn('[DashFlow] Storage set failed:', key, err);
        throw err;
      }
    },

    async remove(key: string): Promise<void> {
      try {
        await storage.remove(key);
      } catch (err) {
        console.warn('[DashFlow] Storage remove failed:', key, err);
      }
    },

    async getMany<T extends Record<string, unknown>>(
      keys: string[]
    ): Promise<Partial<T>> {
      try {
        const result = await storage.get(keys);
        return result as Partial<T>;
      } catch (err) {
        console.warn('[DashFlow] Storage getMany failed:', keys, err);
        return {};
      }
    },
  };
}

export const storageAdapter = createStorageAdapter('local');
