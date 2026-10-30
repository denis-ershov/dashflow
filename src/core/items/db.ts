import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { runLogged } from '@/core/observability/crashLogger';
import type { Board, Item, ItemChange, ItemKind } from './types';

/**
 * Отдельная база IndexedDB для Item. Ключ-значение StorageAdapter для этого не подходит:
 * нужны индексы, транзакции «запись + журнал» и объёмы больше квоты chrome.storage.local.
 * База общая для страниц расширения и сервис-воркера (один origin).
 */

export const ITEMS_DB_NAME = 'dashflow_items';
export const ITEMS_DB_VERSION = 1;

/** Запись журнала без seq: номер — автоинкрементный ключ хранилища */
export type StoredChange = Omit<ItemChange, 'seq'>;

export interface ItemsDbSchema extends DBSchema {
  items: {
    key: string;
    value: Item;
    indexes: {
      kind: ItemKind;
      status: string;
      boardId: string;
      updatedAt: string;
      remindAt: string;
      deletedAt: string;
    };
  };
  boards: {
    key: string;
    value: Board;
  };
  changes: {
    key: number;
    value: StoredChange;
    indexes: { itemId: string };
  };
}

export type ItemsDb = IDBPDatabase<ItemsDbSchema>;

export function openItemsDb(name: string = ITEMS_DB_NAME): Promise<ItemsDb> {
  // Просим браузер не вытеснять данные при нехватке места (без запроса к пользователю в расширении)
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    runLogged(navigator.storage.persist(), 'storage', { stage: 'items-persist' });
  }

  return openDB<ItemsDbSchema>(name, ITEMS_DB_VERSION, {
    upgrade(db) {
      const items = db.createObjectStore('items', { keyPath: 'id' });
      items.createIndex('kind', 'kind');
      items.createIndex('status', 'status');
      items.createIndex('boardId', 'boardId');
      items.createIndex('updatedAt', 'updatedAt');
      items.createIndex('remindAt', 'remindAt');
      items.createIndex('deletedAt', 'deletedAt');

      db.createObjectStore('boards', { keyPath: 'id' });

      const changes = db.createObjectStore('changes', { autoIncrement: true });
      changes.createIndex('itemId', 'itemId');
    },
  });
}
