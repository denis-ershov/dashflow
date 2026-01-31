export { storageAdapter, createStorageAdapter } from './adapter';
export type { StorageAdapter, StorageArea } from './adapter';

export { storageManager, widgetDataKey } from './manager';
export { createIndexedDBBackend } from './indexeddb';
export { createStore, openDb } from './idb';
export type { IdbStore, StoreConfig, IndexConfig } from './idb';
export type { StorageBackend, DataCategory } from './types';

export {
  LAYOUT_SCHEMA_VERSION,
  parseLayout,
  serializeLayout,
  type VersionedLayoutPayload,
} from './layout-schema';
