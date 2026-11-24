import type { Item } from '@/core/items/types';
import { reminderNotificationId, reminderTime } from './reminder';

interface SchedulerPorts {
  listScheduledReminders: () => Promise<Item[]>;
  schedule: (when: number | undefined) => Promise<void>;
  readDelivered: () => Promise<readonly string[]>;
  saveDelivered: (ids: readonly string[]) => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  deliver: (id: string, item: Item) => Promise<void>;
  setBadge: (count: number) => Promise<void>;
  now?: () => number;
}

export function createReminderScheduler(ports: SchedulerPorts) {
  let active: Promise<void> | undefined;
  let pending = false;

  async function reconcile() {
    const items = await ports.listScheduledReminders();
    const now = (ports.now ?? Date.now)();
    const due = new Map<string, Item>();
    let next: number | undefined;
    for (const item of items) {
      const at = reminderTime(item);
      if (at <= now) due.set(reminderNotificationId({ itemId: item.id, at }), item);
      else if (at > now && (next === undefined || at < next)) next = at;
    }

    await ports.schedule(next);
    await ports.setBadge(due.size);
    const delivered = new Set(await ports.readDelivered());
    // Сначала фиксируем попытку доставки, чтобы перезапуск воркера не показал её повторно.
    if (delivered.size !== due.size || Array.from(due.keys()).some((id) => !delivered.has(id))) {
      await ports.saveDelivered(Array.from(due.keys()));
    }
    for (const id of delivered) {
      if (!due.has(id)) await ports.clearNotification(id);
    }
    for (const [id, item] of due) {
      if (!delivered.has(id)) await ports.deliver(id, item);
    }
  }

  return function refresh(): Promise<void> {
    pending = true;
    active ??= (async () => {
      try {
        while (pending) {
          pending = false;
          await reconcile();
        }
      } finally {
        active = undefined;
      }
    })();
    return active;
  };
}
