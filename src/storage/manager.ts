import type { StorageBackend } from './types';
import { createStorageAdapter } from './adapter';
import { createIndexedDBBackend } from './indexeddb';

/**
 * Storage abstraction layer.
 * Routes by key: chrome.storage.local for UI keys, IndexedDB for widget data.
 */

const CHROME_PREFIX = 'dashflow:';
const WIDGET_DATA_PREFIX = 'widget:';

let chromeBackend: StorageBackend | null = null;
let indexedDBBackend: StorageBackend | null = null;

function getChromeBackend(): StorageBackend {
  if (!chromeBackend) {
    const adapter = createStorageAdapter('local');
    chromeBackend = {
      get: adapter.get.bind(adapter),
      set: adapter.set.bind(adapter),
      remove: adapter.remove.bind(adapter),
    };
  }
  return chromeBackend;
}

function getIndexedDBBackend(): StorageBackend {
  if (!indexedDBBackend) {
    indexedDBBackend = createIndexedDBBackend();
  }
  return indexedDBBackend;
}

function getBackendForKey(key: string): StorageBackend {
  if (key.startsWith(WIDGET_DATA_PREFIX)) {
    return getIndexedDBBackend();
  }
  return getChromeBackend();
}

export const storageManager = {
  async get<T>(key: string): Promise<T | null> {
    return getBackendForKey(key).get<T>(key);
  },

  async set(key: string, value: unknown): Promise<void> {
    await getBackendForKey(key).set(key, value);
  },

  async remove(key: string): Promise<void> {
    await getBackendForKey(key).remove(key);
  },

  /** Get many keys (chrome.storage.local only for now) */
  async getMany<T extends Record<string, unknown>>(
    keys: string[]
  ): Promise<Partial<T>> {
    const chromeKeys = keys.filter((k) => !k.startsWith(WIDGET_DATA_PREFIX));
    const widgetKeys = keys.filter((k) => k.startsWith(WIDGET_DATA_PREFIX));

    const chromeAdapter = createStorageAdapter('local');
    let result = {} as Partial<T>;

    if (chromeKeys.length > 0) {
      result = (await chromeAdapter.getMany(chromeKeys)) as Partial<T>;
    }

    if (widgetKeys.length > 0) {
      const idb = getIndexedDBBackend();
      for (const key of widgetKeys) {
        const value = await idb.get(key);
        if (value !== null) {
          (result as Record<string, unknown>)[key] = value;
        }
      }
    }

    return result;
  },
};

/** Key for widget data in IndexedDB: widget:{type}:{instanceId} */
export function widgetDataKey(type: string, instanceId: string): string {
  return `${WIDGET_DATA_PREFIX}${type}:${instanceId}`;
}
