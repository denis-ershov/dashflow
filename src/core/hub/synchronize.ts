import { hubSyncStore } from '@/core/items/hubSyncStore';
import { pullHubChanges, pushHubChanges } from './client';
import type { HubConnection } from './model';

const MAX_PAGES_PER_TICK = 8;

export function createHubSyncEngine({
  store = hubSyncStore,
  pull = pullHubChanges,
  push = pushHubChanges,
} = {}) {
  return async (connection: HubConnection) => {
    await store.connect(connection.id);
    let morePush = false;
    let morePull = false;
    for (let page = 0; page < MAX_PAGES_PER_TICK; page++) {
      const pending = await store.pending(connection.id);
      if (!pending?.changes.length) break;
      const result = await push(connection, pending.changes);
      await store.acknowledge(connection.id, result);
      morePush = page === MAX_PAGES_PER_TICK - 1;
    }
    for (let page = 0; page < MAX_PAGES_PER_TICK; page++) {
      const pending = await store.pending(connection.id);
      if (!pending) break;
      const remote = await pull(connection, pending.since);
      await store.applyPage(connection.id, pending.since, remote);
      morePull = remote.hasMore;
      if (!morePull) break;
    }
    const pending = await store.pending(connection.id);
    return { more: morePush || morePull, oversized: pending?.oversized === true };
  };
}
