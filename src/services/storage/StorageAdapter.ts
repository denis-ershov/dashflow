import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'dashflow_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv_store';

/**
 * Универсальный адаптер хранения данных DashFlow.
 * Автоматически переключается между chrome.storage (в расширении) и localStorage/IndexedDB (в обычных условиях).
 */
export class StorageAdapter {
  private static dbPromise: Promise<IDBPDatabase> | null = null;

  private static getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Чтение стандартного значения настроек/конфигурации (Chrome Sync/Local storage)
   */
  public static async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(key);
        return result[key] !== undefined ? (result[key] as T) : defaultValue;
      } else {
        const item = localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : defaultValue;
      }
    } catch (error) {
      console.warn(`[StorageAdapter] Ошибка чтения ключа "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Запись значения настроек/конфигурации
   */
  public static async set<T>(key: string, value: T): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [key]: value });
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`[StorageAdapter] Ошибка записи ключа "${key}":`, error);
    }
  }

  /**
   * Удаление значения
   */
  public static async remove(key: string): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.remove(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`[StorageAdapter] Ошибка удаления ключа "${key}":`, error);
    }
  }

  /**
   * Очистка всех настроек
   */
  public static async clear(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.clear();
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.error('[StorageAdapter] Ошибка очистки хранилища:', error);
    }
  }

  /**
   * Запись больших объемах данных в IndexedDB (кеш погоды, сохраненные медиафайлы, заметки)
   */
  public static async setLarge<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(STORE_NAME, value, key);
    } catch (error) {
      console.error(`[StorageAdapter] Ошибка записи большого значения "${key}" в IndexedDB:`, error);
    }
  }

  /**
   * Чтение больших объемах данных из IndexedDB
   */
  public static async getLarge<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      const val = await db.get(STORE_NAME, key);
      return val !== undefined ? (val as T) : null;
    } catch (error) {
      console.warn(`[StorageAdapter] Ошибка чтения большого значения "${key}" из IndexedDB:`, error);
      return null;
    }
  }
}
