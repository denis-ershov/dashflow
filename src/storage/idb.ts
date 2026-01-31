/**
 * Type-safe IndexedDB helper for widget data.
 * Multiple object stores, CRUD, Promise-based, TypeScript generics.
 */

const DB_NAME = 'dashflow-db';
const DB_VERSION = 2;

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
}

export interface StoreConfig<K extends string = string> {
  keyPath: K;
  indexes?: IndexConfig[];
}

type StoreNames = 'todo' | 'notes' | 'bookmarks';

const STORE_CONFIGS: Record<StoreNames, StoreConfig> = {
  todo: {
    keyPath: 'id',
    indexes: [{ name: 'instanceId', keyPath: 'instanceId', unique: false }],
  },
  notes: {
    keyPath: 'id',
    indexes: [{ name: 'instanceId', keyPath: 'instanceId', unique: false }],
  },
  bookmarks: {
    keyPath: 'id',
    indexes: [{ name: 'instanceId', keyPath: 'instanceId', unique: false }],
  },
};

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      for (const [name, config] of Object.entries(STORE_CONFIGS)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: config.keyPath as string });
          for (const idx of config.indexes ?? []) {
            store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
          }
        }
      }
      if (!db.objectStoreNames.contains('widget-data')) {
        db.createObjectStore('widget-data', { keyPath: 'key' });
      }
    };
  });
  return dbPromise;
}

function runTransaction<T>(
  storeNames: StoreNames | StoreNames[],
  mode: IDBTransactionMode,
  run: (stores: Record<StoreNames, IDBObjectStore>) => Promise<T>
): Promise<T> {
  return openDb().then((db) => {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = db.transaction(names, mode);
    const stores = names.reduce((acc, n) => {
      acc[n] = tx.objectStore(n);
      return acc;
    }, {} as Record<StoreNames, IDBObjectStore>);
    return run(stores);
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/** Type-safe store interface */
export interface IdbStore<T extends { id: string }> {
  create(item: T): Promise<T>;
  get(id: string): Promise<T | null>;
  getAll(): Promise<T[]>;
  getByIndex(indexName: string, value: IDBValidKey): Promise<T[]>;
  update(item: T): Promise<void>;
  /** Batch update - single transaction for multiple items */
  updateMany(items: T[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByIndex(indexName: string, value: IDBValidKey): Promise<void>;
}

export function createStore<T extends { id: string }>(
  storeName: StoreNames
): IdbStore<T> {
  return {
    async create(item: T): Promise<T> {
      await runTransaction(storeName, 'readwrite', async (stores) => {
        await promisify(stores[storeName].add(item));
      });
      return item;
    },

    async get(id: string): Promise<T | null> {
      const result = await runTransaction(storeName, 'readonly', async (stores) => {
        return promisify(stores[storeName].get(id));
      });
      return (result ?? null) as T | null;
    },

    async getAll(): Promise<T[]> {
      return runTransaction(storeName, 'readonly', async (stores) => {
        return promisify(stores[storeName].getAll());
      });
    },

    async getByIndex(indexName: string, value: IDBValidKey): Promise<T[]> {
      return runTransaction(storeName, 'readonly', async (stores) => {
        const store = stores[storeName];
        const index = store.index(indexName);
        return promisify(index.getAll(value));
      });
    },

    async update(item: T): Promise<void> {
      await runTransaction(storeName, 'readwrite', async (stores) => {
        await promisify(stores[storeName].put(item));
      });
    },

    async updateMany(items: T[]): Promise<void> {
      if (items.length === 0) return;
      await runTransaction(storeName, 'readwrite', async (stores) => {
        const store = stores[storeName];
        for (const item of items) {
          await promisify(store.put(item));
        }
      });
    },

    async delete(id: string): Promise<void> {
      await runTransaction(storeName, 'readwrite', async (stores) => {
        await promisify(stores[storeName].delete(id));
      });
    },

    async deleteByIndex(indexName: string, value: IDBValidKey): Promise<void> {
      await runTransaction(storeName, 'readwrite', async (stores) => {
        const store = stores[storeName];
        const index = store.index(indexName);
        const keys = await promisify(index.getAllKeys(value));
        for (const key of keys) {
          await promisify(store.delete(key));
        }
      });
    },
  };
}
