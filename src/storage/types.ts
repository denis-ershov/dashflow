/**
 * Storage strategy - type definitions.
 * chrome.storage.local for UI/layout, IndexedDB for widget data.
 */

export type StorageBackendType = 'chrome' | 'indexeddb';

export interface StorageBackend {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  keys?(): Promise<string[]>;
}

export type DataCategory = 'ui' | 'widget-data';

/** Data that lives in chrome.storage.local */
export const CHROME_STORAGE_CATEGORIES: DataCategory[] = ['ui'];

/** Data that lives in IndexedDB */
export const INDEXEDDB_CATEGORIES: DataCategory[] = ['widget-data'];

export const DATA_CATEGORY_STORAGE: Record<DataCategory, StorageBackendType> = {
  ui: 'chrome',
  'widget-data': 'indexeddb',
};
