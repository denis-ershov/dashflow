import { requestBrowserPermissions } from '@/core/permissions/browserPermissions';

const PROMPTED_KEY = 'dashflow_notifications_prompted';

export function shouldOfferReminderNotifications(): boolean {
  if (typeof chrome === 'undefined' || !chrome.permissions?.request) return false;
  try {
    return localStorage.getItem(PROMPTED_KEY) !== 'true';
  } catch {
    return false;
  }
}

/** Вызывается из жеста пользователя до первого await обработчика. */
export async function requestReminderNotificationsOnce(): Promise<void> {
  if (!shouldOfferReminderNotifications()) return;
  try {
    localStorage.setItem(PROMPTED_KEY, 'true');
    await requestBrowserPermissions({ permissions: ['notifications'] });
  } catch {
    // Напоминание сохраняется при любом результате запроса прав.
  }
}
