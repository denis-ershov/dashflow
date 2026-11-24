import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createItemRepository } from '@/core/items/repository';
import {
  requestReminderNotificationsOnce,
  shouldOfferReminderNotifications,
} from '@/core/reminders/notificationConsent';
import {
  applyReminderAction,
  readReminderNotification,
  reminderNotificationId,
} from '@/core/reminders/reminder';
import { createReminderScheduler } from '@/core/reminders/scheduler';

const NOW = Date.parse('2026-11-23T10:00:00Z');
const HOUR = 3_600_000;
const source = { type: 'user', id: 'local', name: 'local' } as const;
let sequence = 0;
const repo = () => createItemRepository({ dbName: `reminders-test-${++sequence}` });
const at = (time: number) => new Date(time).toISOString();

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Напоминания', () => {
  it('вызывает запрос прав до ожидания результата и не повторяет запрос после отказа', async () => {
    const request = vi.fn(
      (_: chrome.permissions.Permissions, respond: (granted: boolean) => void) =>
        queueMicrotask(() => respond(false)),
    );
    vi.stubGlobal('chrome', { permissions: { request }, runtime: { id: 'extension' } });
    expect(shouldOfferReminderNotifications()).toBe(true);

    const pending = requestReminderNotificationsOnce();
    expect(request).toHaveBeenCalledExactlyOnceWith(
      { permissions: ['notifications'], origins: [] },
      expect.any(Function),
    );
    await expect(pending).resolves.toBeUndefined();
    expect(shouldOfferReminderNotifications()).toBe(false);
    await requestReminderNotificationsOnce();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('восстанавливает ближайший будильник после запуска и не повторяет доставку после перезапуска', async () => {
    const repository = repo();
    await repository.create({ kind: 'task', title: 'Позже', remindAt: at(NOW + 2 * HOUR) }, source);
    const first = await repository.create(
      { kind: 'task', title: 'Скоро', remindAt: at(NOW + HOUR) },
      source,
    );
    await repository.create(
      { kind: 'task', title: 'Завершено', status: 'done', remindAt: at(NOW) },
      source,
    );
    const archived = await repository.create(
      { kind: 'task', title: 'Архив', remindAt: at(NOW) },
      source,
    );
    await repository.update(archived.id, { archivedAt: at(NOW) }, source);
    let clock = NOW;
    let delivered: readonly string[] = [];
    const ports = {
      listScheduledReminders: () => repository.listScheduledReminders(),
      schedule: vi.fn(async (_when: number | undefined) => {}),
      readDelivered: async () => delivered,
      saveDelivered: async (ids: readonly string[]) => {
        delivered = ids;
      },
      clearNotification: vi.fn(async (_id: string) => {}),
      deliver: vi.fn(async (_id: string) => {}),
      setBadge: vi.fn(async (_count: number) => {}),
      now: () => clock,
    };

    await createReminderScheduler(ports)();
    expect(ports.schedule).toHaveBeenLastCalledWith(NOW + HOUR);
    expect(ports.setBadge).toHaveBeenLastCalledWith(0);
    expect(ports.deliver).not.toHaveBeenCalled();

    clock += HOUR;
    const onAlarm = createReminderScheduler(ports);
    await Promise.all([onAlarm(), onAlarm()]);
    await createReminderScheduler(ports)();
    const notificationId = reminderNotificationId({ itemId: first.id, at: clock });
    expect(ports.schedule).toHaveBeenLastCalledWith(NOW + 2 * HOUR);
    expect(ports.setBadge).toHaveBeenLastCalledWith(1);
    expect(ports.deliver).toHaveBeenCalledExactlyOnceWith(notificationId, first);

    await repository.update(first.id, { remindAt: null }, source);
    await createReminderScheduler(ports)();
    expect(ports.setBadge).toHaveBeenLastCalledWith(0);
    expect(ports.clearNotification).toHaveBeenCalledExactlyOnceWith(notificationId);
    expect(delivered).toEqual([]);
    await repository.close();
  });

  it('переносит напоминание на час и отклоняет действие из старого уведомления', async () => {
    const repository = repo();
    const item = await repository.create(
      { kind: 'task', title: 'Задача', remindAt: at(NOW) },
      source,
    );
    const context = { repository, source };
    const occurrence = { itemId: item.id, at: NOW };
    expect(readReminderNotification(reminderNotificationId(occurrence))).toEqual(occurrence);
    expect(await applyReminderAction(context, occurrence, 'snooze', NOW)).toBe(true);
    expect(await applyReminderAction(context, occurrence, 'complete', NOW + HOUR)).toBe(false);
    expect(await repository.get(item.id)).toMatchObject({
      remindAt: at(NOW + HOUR),
      status: 'inbox',
    });
    expect(
      await applyReminderAction(context, { ...occurrence, at: NOW + HOUR }, 'complete', NOW + HOUR),
    ).toBe(true);
    expect(await repository.get(item.id)).toMatchObject({ status: 'done' });
    await repository.close();
  });

  it('сохраняет параллельное изменение между чтением уведомления и командой', async () => {
    const repository = repo();
    const item = await repository.create(
      { kind: 'task', title: 'Задача', remindAt: at(NOW) },
      source,
    );
    vi.spyOn(repository, 'get').mockImplementationOnce(async () => {
      await repository.update(item.id, { remindAt: at(NOW + HOUR) }, source);
      return item;
    });
    await expect(
      applyReminderAction({ repository, source }, { itemId: item.id, at: NOW }, 'complete', NOW),
    ).rejects.toMatchObject({ name: 'ItemConflictError' });
    expect(await repository.get(item.id)).toMatchObject({
      remindAt: at(NOW + HOUR),
      status: 'inbox',
    });
    await repository.close();
  });
});
