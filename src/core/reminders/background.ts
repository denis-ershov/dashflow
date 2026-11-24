import { browser } from 'wxt/browser';
import { reminders as en } from '@/core/i18n/locales/en/reminders';
import { reminders as ru } from '@/core/i18n/locales/ru/reminders';
import { subscribeItemsChanged } from '@/core/items/events';
import { itemRepository } from '@/core/items/instance';
import { asRecord } from '@/core/network/jsonReaders';
import { applyReminderAction, readReminderNotification } from './reminder';
import { createReminderScheduler } from './scheduler';

const ALARM = 'dashflow:next-reminder';
const DELIVERY_KEY = 'dashflow_reminders_delivered';
const LANGUAGE_KEY = 'dashflow_i18n_store';
const NOTIFICATION_PERMISSION: Parameters<typeof browser.permissions.contains>[0] = {
  permissions: ['notifications'],
};
const REMINDER_SOURCE = { type: 'user', id: 'local', name: 'local' } as const;

async function schedule(when: number | undefined) {
  const current = await browser.alarms.get(ALARM);
  if (when === undefined) {
    if (current) await browser.alarms.clear(ALARM);
  } else if (current?.scheduledTime !== when) {
    await browser.alarms.create(ALARM, { when });
  }
}

async function readDelivered(): Promise<string[]> {
  const result = (await browser.storage.local.get(DELIVERY_KEY))[DELIVERY_KEY];
  if (!Array.isArray(result)) return [];
  return result.filter(
    (id): id is string => typeof id === 'string' && Boolean(readReminderNotification(id)),
  );
}

function openReminders(notificationId?: string) {
  const url = browser.runtime.getURL('/reminders.html');
  return browser.tabs.create({
    url: notificationId ? `${url}?notification=${encodeURIComponent(notificationId)}` : url,
  });
}

export function startReminderBackground() {
  const action = browser.action ?? browser.browserAction;

  const refresh = createReminderScheduler({
    listScheduledReminders: () => itemRepository.listScheduledReminders(),
    schedule,
    readDelivered,
    saveDelivered: (ids) => browser.storage.local.set({ [DELIVERY_KEY]: ids }),
    async clearNotification(id) {
      try {
        await browser.notifications?.clear(id);
      } catch {
        // Пользователь мог отозвать право, пока уведомление было открыто.
      }
    },
    async deliver(id, item) {
      try {
        if (
          !browser.notifications ||
          !(await browser.permissions.contains(NOTIFICATION_PERMISSION))
        )
          return;
        const result = await browser.storage.local.get(LANGUAGE_KEY);
        const preferred = asRecord(asRecord(result[LANGUAGE_KEY]).state).language;
        const language =
          preferred === 'ru' || preferred === 'en'
            ? preferred
            : browser.i18n.getUILanguage().toLowerCase().split('-')[0];
        const labels = language === 'ru' ? ru : en;
        const buttons =
          !import.meta.env.FIREFOX && browser.notifications.onButtonClicked
            ? [{ title: labels.complete }, { title: labels.snooze }]
            : undefined;
        await browser.notifications.create(id, {
          type: 'basic',
          iconUrl: browser.runtime.getURL('/icons/icon-128.png'),
          title: labels.title,
          message: item.title,
          ...(buttons ? { buttons } : {}),
        });
      } catch {
        // Отказ или недоступность системной доставки оставляют напоминание в Inbox и на бейдже.
      }
    },
    async setBadge(count) {
      await action?.setBadgeText({ text: count > 99 ? '99+' : count ? String(count) : '' });
    },
  });

  async function refreshSafely(): Promise<boolean> {
    try {
      await refresh();
      return true;
    } catch {
      // При временной ошибке хранилища оставляем созданный будильник либо ставим повторную попытку.
      try {
        if (!(await browser.alarms.get(ALARM))) {
          await browser.alarms.create(ALARM, { delayInMinutes: 1 });
        }
      } catch {
        console.warn('[DashFlow] Не удалось запланировать напоминания');
      }
      return false;
    }
  }

  async function handleNotificationButton(id: string, index: number) {
    const occurrence = readReminderNotification(id);
    if (!occurrence || (index !== 0 && index !== 1)) return;
    try {
      await applyReminderAction(
        { repository: itemRepository, source: REMINDER_SOURCE },
        occurrence,
        index === 0 ? 'complete' : 'snooze',
      );
    } catch {
      await openReminders(id);
    } finally {
      await refreshSafely();
    }
  }

  let boundNotifications: typeof browser.notifications | undefined;
  function bindNotifications() {
    const notifications = browser.notifications;
    if (!notifications || notifications === boundNotifications) return;
    boundNotifications = notifications;
    notifications.onClicked.addListener((id) => {
      const occurrence = readReminderNotification(id);
      if (occurrence) void openReminders(id).catch(reportOpenError);
    });
    if (!import.meta.env.FIREFOX) {
      notifications.onButtonClicked?.addListener((id, index) => {
        void handleNotificationButton(id, index).catch(reportOpenError);
      });
    }
  }

  action?.onClicked.addListener(() => {
    void (async () => {
      await refreshSafely();
      if (await action.getBadgeText({})) await openReminders();
      else await browser.tabs.create({});
    })().catch(reportOpenError);
  });
  browser.alarms.onAlarm.addListener(({ name }) => {
    if (name === ALARM) void refreshSafely();
  });
  browser.runtime.onInstalled.addListener(() => void refreshSafely());
  browser.runtime.onStartup.addListener(() => void refreshSafely());
  browser.permissions.onAdded.addListener(bindNotifications);
  subscribeItemsChanged((event) => {
    if (event.itemIds.length) void refreshSafely();
  });
  bindNotifications();
  void refreshSafely();
  return refreshSafely;
}

function reportOpenError() {
  console.warn('[DashFlow] Не удалось открыть напоминания');
}
