import { openDB, type IDBPDatabase } from 'idb';
import { StorageError, StorageQuotaExceededError } from './errors';
import type { StorageKey } from './keys';

const DB_NAME = 'dashflow_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv_store';

/**
 * Универсальный адаптер хранения данных DashFlow.
 * Автоматически переключается между chrome.storage (в расширении) и localStorage/IndexedDB.
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
   * Проверка является ли ошибка превышением квоты хранилища
   */
  public static isQuotaError(error: unknown): boolean {
    if (!error) return false;

    if (error instanceof Error) {
      const name = error.name;
      const message = error.message;
      const code = 'code' in error ? (error as { code?: unknown }).code : undefined;

      return (
        name === 'QuotaExceededError' ||
        name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        code === 22 ||
        code === 1014 ||
        message.toLowerCase().includes('quota') ||
        message.toLowerCase().includes('storage limit')
      );
    }

    if (typeof error === 'object') {
      const err = error as Record<string, unknown>;
      const name = typeof err.name === 'string' ? err.name : '';
      const message = typeof err.message === 'string' ? err.message : '';
      const code = err.code;

      return (
        name === 'QuotaExceededError' ||
        name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        code === 22 ||
        code === 1014 ||
        message.toLowerCase().includes('quota') ||
        message.toLowerCase().includes('storage limit')
      );
    }

    return false;
  }

  /**
   * Низкоуровневая запись в целевое хранилище (вынесена для тестируемости и перехвата)
   */
  public static async writeRaw(key: string, serializedValue: string, rawValue: unknown): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: rawValue });
    } else {
      localStorage.setItem(key, serializedValue);
    }
  }

  /**
   * Чтение значения настроек или конфигурации
   */
  public static async get<T>(key: StorageKey, defaultValue: T): Promise<T> {
    try {
      const keyStr = String(key);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(keyStr);
        return result[keyStr] !== undefined ? (result[keyStr] as T) : defaultValue;
      } else {
        const item = localStorage.getItem(keyStr);
        if (item === null) return defaultValue;
        try {
          return JSON.parse(item) as T;
        } catch {
          return defaultValue;
        }
      }
    } catch {
      return defaultValue;
    }
  }

  /**
   * Запись значения с гарантированной обработкой ошибок и квот (Правило 25)
   */
  public static async set<T>(key: StorageKey, value: T): Promise<void> {
    const keyStr = String(key);
    try {
      const serialized = JSON.stringify(value);
      await this.writeRaw(keyStr, serialized, value);
    } catch (error: unknown) {
      if (this.isQuotaError(error)) {
        throw new StorageQuotaExceededError(error);
      }
      throw new StorageError(`Ошибка сохранения ключа "${keyStr}" в хранилище`, error);
    }
  }

  /**
   * Удаление значения по ключу
   */
  public static async remove(key: StorageKey): Promise<void> {
    const keyStr = String(key);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.remove(keyStr);
      } else {
        localStorage.removeItem(keyStr);
      }
    } catch (error: unknown) {
      throw new StorageError(`Ошибка удаления ключа "${keyStr}"`, error);
    }
  }

  /**
   * Полная очистка хранилища
   */
  public static async clear(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.clear();
      } else {
        localStorage.clear();
      }
    } catch (error: unknown) {
      throw new StorageError('Ошибка очистки хранилища', error);
    }
  }

  /**
   * Запись больших объёмов данных в IndexedDB (обои, кеш погоды)
   */
  public static async setLarge<T>(key: StorageKey, value: T): Promise<void> {
    const keyStr = String(key);
    try {
      const db = await this.getDB();
      await db.put(STORE_NAME, value, keyStr);
    } catch (error: unknown) {
      if (this.isQuotaError(error)) {
        throw new StorageQuotaExceededError(error);
      }
      throw new StorageError(`Ошибка записи большого значения "${keyStr}" в IndexedDB`, error);
    }
  }

  /**
   * Чтение больших объёмов данных из IndexedDB
   */
  public static async getLarge<T>(key: StorageKey): Promise<T | null> {
    const keyStr = String(key);
    try {
      const db = await this.getDB();
      const val = (await db.get(STORE_NAME, keyStr)) as unknown;
      return val !== undefined ? (val as T) : null;
    } catch {
      return null;
    }
  }
}
