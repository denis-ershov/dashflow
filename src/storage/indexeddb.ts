import type { StorageBackend } from './types';
import { openDb } from './idb';

const STORE_NAME = 'widget-data';

export function createIndexedDBBackend(): StorageBackend {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const db = await openDb();
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const result = await new Promise<{ value: unknown } | undefined>((resolve, reject) => {
          const request = store.get(key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
        return (result?.value ?? null) as T | null;
      } catch (err) {
        console.warn('[DashFlow] IndexedDB get failed:', key, err);
        return null;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      try {
        const db = await openDb();
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        await new Promise<void>((resolve, reject) => {
          const request = store.put({ key, value });
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (err) {
        console.warn('[DashFlow] IndexedDB set failed:', key, err);
        throw err;
      }
    },

    async remove(key: string): Promise<void> {
      try {
        const db = await openDb();
        const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (err) {
        console.warn('[DashFlow] IndexedDB remove failed:', key, err);
      }
    },

    async keys(): Promise<string[]> {
      try {
        const db = await openDb();
        const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const raw = await new Promise<unknown[]>((resolve, reject) => {
          const request = store.getAllKeys();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(Array.from(request.result ?? []));
        });
        return raw.filter((k): k is string => typeof k === 'string');
      } catch (err) {
        console.warn('[DashFlow] IndexedDB keys failed:', err);
        return [];
      }
    },
  };
}
