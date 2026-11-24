import type { IDBPTransaction } from 'idb';
import { asRecord } from '@/core/network/jsonReaders';
import {
  HUB_BODY_LIMIT,
  HUB_SYNC_BATCH,
  type HubChangePage,
  type HubPushChange,
  type HubSyncSnapshot,
} from '../../../packages/shared/src/sync';
import { type ItemsDbSchema, openItemsDb } from './db';
import { publishItemsChanged, type ItemsChangedEvent } from './events';
import {
  HUB_STATE_KEY,
  HUB_WRITE_STORES,
  hubEntityKey,
  itemSnapshot,
  queueHubWrites,
  readHubState,
} from './hubOutbox';

const SYNC_STORES = ['items', 'boards', 'itemHistory', ...HUB_WRITE_STORES] as const;
type SyncTx = IDBPTransaction<ItemsDbSchema, typeof SYNC_STORES, 'readwrite'>;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = asRecord(value);
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(',')}}`;
}

async function currentSnapshot(tx: SyncTx, incoming: HubSyncSnapshot, version: number) {
  if (incoming.entity === 'item') {
    const item = await tx.objectStore('items').get(incoming.id);
    return item && itemSnapshot(item);
  }
  const board = await tx.objectStore('boards').get(incoming.id);
  return (
    board && {
      entity: 'board' as const,
      id: incoming.id,
      version,
      op: 'upsert' as const,
      value: board,
    }
  );
}

async function installRemote(tx: SyncTx, incoming: HubSyncSnapshot, event: ItemsChangedEvent) {
  if (incoming.entity === 'board') {
    const boards = tx.objectStore('boards');
    if (incoming.op === 'delete') await boards.delete(incoming.id);
    else await boards.put(incoming.value);
    event.boards = true;
    return;
  }
  const items = tx.objectStore('items');
  if (incoming.op === 'delete') {
    const item = await items.get(incoming.id);
    if (item) {
      const deletedAt = item.deletedAt ?? new Date().toISOString();
      await items.put({ ...item, deletedAt, version: incoming.version, updatedAt: deletedAt });
    }
  } else {
    await items.put(incoming.value);
  }
  event.itemIds.push(incoming.id);
}

async function acceptRemote(
  tx: SyncTx,
  incoming: HubSyncSnapshot,
  event: ItemsChangedEvent,
  pushedKey?: string,
) {
  const key = hubEntityKey(incoming.entity, incoming.id);
  const outbox = tx.objectStore('hubOutbox');
  const pending = (await outbox.get(key))?.change;
  if (
    (pushedKey && pending?.idempotencyKey !== pushedKey) ||
    (pending && incoming.version < pending.version)
  ) {
    return;
  }
  const versions = tx.objectStore('hubVersions');
  const currentVersion = (await versions.get(key))?.version ?? 0;
  if (incoming.version < currentVersion) return;
  const previous = await currentSnapshot(tx, incoming, currentVersion);
  const same = canonicalJson(previous?.value ?? null) === canonicalJson(incoming.value);
  if (!same) {
    if (pending && previous?.value) {
      await tx.objectStore('itemHistory').put({ key, earlier: previous });
    }
    await installRemote(tx, incoming, event);
  }
  await versions.put({ key, version: incoming.version });
  if (pending) await outbox.delete(key);
}

export function createHubSyncStore(
  name?: string,
  notify: (event: ItemsChangedEvent) => void = publishItemsChanged,
) {
  let connection: ReturnType<typeof openItemsDb> | undefined;
  const db = () => (connection ??= openItemsDb(name));

  async function mutate(
    connectionId: string,
    callback: (tx: SyncTx, event: ItemsChangedEvent, since: number) => Promise<void>,
  ) {
    const tx = (await db()).transaction(SYNC_STORES, 'readwrite');
    const state = readHubState((await tx.objectStore('meta').get(HUB_STATE_KEY))?.value);
    const event: ItemsChangedEvent = { type: 'items-changed', itemIds: [] };
    if (state?.connectionId === connectionId) await callback(tx, event, state.since);
    await tx.done;
    if (event.itemIds.length || event.boards) notify(event);
  }

  return {
    async connect(connectionId: string) {
      const tx = (await db()).transaction(SYNC_STORES, 'readwrite');
      const meta = tx.objectStore('meta');
      const state = readHubState((await meta.get(HUB_STATE_KEY))?.value);
      if (state?.connectionId !== connectionId) {
        await tx.objectStore('hubOutbox').clear();
        await tx.objectStore('hubVersions').clear();
        await meta.put({ key: HUB_STATE_KEY, value: { connectionId, since: 0 } });
        const [items, boards] = await Promise.all([
          tx.objectStore('items').getAll(),
          tx.objectStore('boards').getAll(),
        ]);
        await queueHubWrites(tx, items, boards);
      }
      await tx.done;
    },

    async disconnect(connectionId: string) {
      await mutate(connectionId, async (tx) => {
        await tx.objectStore('meta').delete(HUB_STATE_KEY);
        await tx.objectStore('hubOutbox').clear();
        await tx.objectStore('hubVersions').clear();
      });
    },

    async pending(connectionId: string) {
      const tx = (await db()).transaction(['meta', 'hubOutbox'], 'readonly');
      const state = readHubState((await tx.objectStore('meta').get(HUB_STATE_KEY))?.value);
      if (state?.connectionId !== connectionId) return undefined;
      const changes: HubPushChange[] = [];
      const encoder = new TextEncoder();
      const overhead = encoder.encode('{"changes":[]}').byteLength;
      let size = overhead;
      let oversized = false;
      let cursor = await tx.objectStore('hubOutbox').openCursor();
      while (cursor && changes.length < HUB_SYNC_BATCH) {
        const { change } = cursor.value;
        const bytes = encoder.encode(JSON.stringify(change)).byteLength;
        if (bytes + overhead > HUB_BODY_LIMIT) oversized = true;
        else {
          const added = bytes + (changes.length ? 1 : 0);
          if (size + added > HUB_BODY_LIMIT) break;
          size += added;
          changes.push(change);
        }
        cursor = await cursor.continue();
      }
      return { since: state.since, changes, oversized };
    },

    async applyPage(connectionId: string, since: number, page: HubChangePage) {
      await mutate(connectionId, async (tx, event, activeSince) => {
        if (since !== activeSince) return;
        for (const change of page.changes) await acceptRemote(tx, change, event);
        await tx.objectStore('meta').put({
          key: HUB_STATE_KEY,
          value: { connectionId, since: page.nextSince },
        });
      });
    },

    async acknowledge(connectionId: string, snapshots: readonly HubPushChange[]) {
      await mutate(connectionId, async (tx, event) => {
        for (const { idempotencyKey, ...change } of snapshots) {
          await acceptRemote(tx, change, event, idempotencyKey);
        }
      });
    },

    async earlierItem(id: string) {
      const row = await (await db()).get('itemHistory', hubEntityKey('item', id));
      if (row?.earlier.entity === 'item' && row.earlier.op === 'upsert') return row.earlier.value;
      return undefined;
    },

    async close() {
      if (connection) (await connection).close();
      connection = undefined;
    },
  };
}

export const hubSyncStore = createHubSyncStore();
