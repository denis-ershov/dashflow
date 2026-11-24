import { browser } from 'wxt/browser';
import { itemRepository } from '@/core/items/instance';
import {
  CAPTURE_MENU_ID,
  CAPTURE_SOURCE,
  CONTEXT_MENU_PERMISSION,
  menuCaptureDraft,
} from './model';

function setCaptureBadge(tabId: number, text: string | null) {
  const action = chrome.action ?? chrome.browserAction;
  return new Promise<void>((resolve) => {
    action.setBadgeText(text === null ? { tabId } : { text, tabId }, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

export function startCaptureMenu() {
  let bound: typeof chrome.contextMenus | undefined;
  const badgeTimers = new Map<number, ReturnType<typeof setTimeout>>();

  async function confirm(tabId: number | undefined, success: boolean) {
    if (tabId === undefined) return;
    clearTimeout(badgeTimers.get(tabId));
    await setCaptureBadge(tabId, success ? '✓' : '!');
    badgeTimers.set(
      tabId,
      setTimeout(() => {
        badgeTimers.delete(tabId);
        void setCaptureBadge(tabId, null).catch(() => undefined);
      }, 4_000),
    );
  }

  const handleClick: Parameters<typeof chrome.contextMenus.onClicked.addListener>[0] = (
    info,
    tab,
  ) => {
    if (info.menuItemId !== CAPTURE_MENU_ID) return;
    void (async () => {
      if (!(await browser.permissions.contains(CONTEXT_MENU_PERMISSION))) return;
      const draft = menuCaptureDraft(info, tab);
      if (draft) await itemRepository.create(draft, CAPTURE_SOURCE);
      await confirm(tab?.id, Boolean(draft));
    })().catch(() => {
      void confirm(tab?.id, false).catch(() => undefined);
    });
  };

  function bindClicks() {
    const menus = chrome.contextMenus;
    if (menus && menus !== bound) {
      bound = menus;
      menus.onClicked.addListener(handleClick);
    }
  }

  async function registerMenu() {
    if (!(await browser.permissions.contains(CONTEXT_MENU_PERMISSION))) return;
    bindClicks();
    const menus = chrome.contextMenus;
    if (!menus) return;
    const options = {
      title: chrome.i18n.getMessage('quickCaptureMenu'),
      contexts: ['page', 'selection', 'link'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    } satisfies Omit<chrome.contextMenus.CreateProperties, 'id'>;
    const updated = await new Promise<boolean>((resolve) => {
      menus.update(CAPTURE_MENU_ID, options, () => resolve(!chrome.runtime.lastError));
    });
    if (!updated) {
      const created = await new Promise<boolean>((resolve) => {
        menus.create({ id: CAPTURE_MENU_ID, ...options }, () => resolve(!chrome.runtime.lastError));
      });
      if (!created) throw new Error('capture-menu-registration');
    }
  }

  function refresh() {
    void registerMenu().catch(() => {
      console.warn('[DashFlow] Не удалось зарегистрировать меню быстрого захвата');
    });
  }

  bindClicks();
  browser.permissions.onAdded.addListener(({ permissions }) => {
    if (permissions?.includes('contextMenus')) refresh();
  });
  browser.permissions.onRemoved.addListener(({ permissions }) => {
    if (!permissions?.includes('contextMenus')) return;
    bound?.onClicked.removeListener(handleClick);
    bound = undefined;
  });
  browser.runtime.onInstalled.addListener(refresh);
  refresh();
}
