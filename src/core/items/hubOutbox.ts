import type { IDBPObjectStore } from 'idb';
import { asRecord } from '@/core/network/jsonReaders';
import type { HubSyncSnapshot } from '../../../packages/shared/src/sync';
import type { ItemsDbSchema } from './db';
import { ulid } from './ids';
import type { Board, Item } from './types';

export const HUB_WRITE_STORES = ['meta', 'hubOutbox', 'hubVersions'] as const;
export const HUB_STATE_KEY = 'hub-sync';
type HubWriteStore = (typeof HUB_WRITE_STORES)[number];
type WritableStore<Name extends HubWriteStore> = Pick<
  IDBPObjectStore<ItemsDbSchema, readonly HubWriteStore[], Name, 'readwrite'>,
  'get' | 'put'
>;
type WriteTx = {
  objectStore<Name extends HubWriteStore>(name: Name): WritableStore<Name>;
};

export function hubEntityKey(entity: HubSyncSnapshot['entity'], id: string) {
  return `${entity}:${id}`;
}

export function readHubState(value: unknown) {
  const { connectionId, since } = asRecord(value);
  if (typeof connectionId === 'string' && typeof since === 'number') {
    return { connectionId, since };
  }
  return undefined;
}

export function itemSnapshot(item: Item, version = item.version): HubSyncSnapshot {
  const fields = { entity: 'item' as const, id: item.id, version };
  if (item.deletedAt) return { ...fields, op: 'delete', value: null };
  return { ...fields, op: 'upsert', value: { ...item, version } };
}

async function writePending(tx: WriteTx, change: HubSyncSnapshot) {
  const key = hubEntityKey(change.entity, change.id);
  await tx.objectStore('hubVersions').put({ key, version: change.version });
  await tx.objectStore('hubOutbox').put({ key, change: { ...change, idempotencyKey: ulid() } });
}

export async function queueHubWrites(
  tx: WriteTx,
  items: readonly Item[],
  boards: readonly Board[] = [],
) {
  if (!items.length && !boards.length) return;
  const marker = await tx.objectStore('meta').get(HUB_STATE_KEY);
  if (!readHubState(marker?.value)) return;
  const versions = tx.objectStore('hubVersions');
  for (const board of boards) {
    const key = hubEntityKey('board', board.id);
    const version = ((await versions.get(key))?.version ?? 0) + 1;
    await writePending(tx, { entity: 'board', op: 'upsert', id: board.id, version, value: board });
  }
  for (const item of items) {
    const key = hubEntityKey('item', item.id);
    const previous = (await versions.get(key))?.version ?? 0;
    await writePending(tx, itemSnapshot(item, Math.max(previous + 1, item.version)));
  }
}
