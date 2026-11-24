import { itemComplete, itemSnooze } from '@/core/commands/itemCommands';
import type { CommandContext } from '@/core/commands/types';
import type { Item } from '@/core/items/types';

const HOUR_MS = 60 * 60 * 1000;
const NOTIFICATION_ID = /^dashflow-reminder:([A-Za-z0-9_-]{1,64}):(-?\d{1,16})$/;

export interface ReminderOccurrence {
  itemId: string;
  at: number;
}

export function reminderTime(item: Item): number {
  return Date.parse(item.remindAt ?? '');
}

export function reminderNotificationId({ itemId, at }: ReminderOccurrence): string {
  return `dashflow-reminder:${itemId}:${at}`;
}

export function readReminderNotification(id: string): ReminderOccurrence | undefined {
  const [, itemId, timestamp] = NOTIFICATION_ID.exec(id) ?? [];
  if (!itemId || !timestamp) return undefined;
  return { itemId, at: Number(timestamp) };
}

export function isCurrentReminder(
  item: Item | undefined,
  at: number,
  now = Date.now(),
): item is Item {
  return Boolean(
    item &&
    !item.deletedAt &&
    !item.archivedAt &&
    item.status !== 'done' &&
    reminderTime(item) === at &&
    at <= now,
  );
}

export async function applyReminderAction(
  context: CommandContext,
  { itemId, at }: ReminderOccurrence,
  action: 'complete' | 'snooze',
  now = Date.now(),
): Promise<boolean> {
  const item = await context.repository.get(itemId);
  if (!isCurrentReminder(item, at, now)) return false;
  const payload = { id: item.id, expectedVersion: item.version };
  if (action === 'complete') {
    await itemComplete.execute({ ...payload, done: true }, context);
  } else {
    await itemSnooze.execute({ ...payload, until: new Date(now + HOUR_MS).toISOString() }, context);
  }
  return true;
}
