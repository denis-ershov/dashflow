import { defineBackground } from 'wxt/utils/define-background';
import {
  fetchFeedText,
  isBackgroundRequest,
  type FetchRssFeedResponse,
} from '@/core/network/feedProxy';

/**
 * Обновление применяется, только когда не открыта ни одна вкладка DashFlow: немедленный
 * reload закрыл бы их вместе с недописанной заметкой. Без runtime.getContexts (Firefox,
 * Chrome < 116) не перезапускаемся — браузер сам применит обновление при простое или рестарте.
 * Флаг хранится в storage.session: воркер может быть остановлен между событиями.
 */
const UPDATE_PENDING_KEY = 'dashflow_update_pending';

async function reloadIfNoOpenTabs(): Promise<void> {
  if (!chrome.runtime.getContexts || !chrome.storage.session) return;
  try {
    const stored = await chrome.storage.session.get(UPDATE_PENDING_KEY);
    if (stored[UPDATE_PENDING_KEY] !== true) return;
    const tabs = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.TAB],
    });
    if (tabs.length === 0) chrome.runtime.reload();
  } catch {
    // Без списка контекстов перезапуск небезопасен — ждём применения браузером
  }
}

async function markUpdatePending(): Promise<void> {
  try {
    await chrome.storage.session?.set({ [UPDATE_PENDING_KEY]: true });
  } catch {
    return;
  }
  await reloadIfNoOpenTabs();
}

function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: FetchRssFeedResponse) => void,
): boolean {
  // Принимаем сообщения только от страниц самого расширения
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ success: false, error: 'FORBIDDEN_SENDER' });
    return false;
  }
  if (!isBackgroundRequest(message)) {
    sendResponse({ success: false, error: 'BAD_REQUEST' });
    return false;
  }

  void (async () => {
    sendResponse(await fetchFeedText(message.url));
  })();
  return true; // ответ асинхронный
}

export default defineBackground(() => {
  if (typeof chrome === 'undefined') return;

  // Клик по иконке расширения открывает новую вкладку с DashFlow
  chrome.action?.onClicked.addListener(() => {
    void chrome.tabs.create({});
  });

  chrome.runtime.onUpdateAvailable?.addListener(() => void markUpdatePending());
  // Для onRemoved право tabs не нужно: приходит только id вкладки
  chrome.tabs?.onRemoved.addListener(() => void reloadIfNoOpenTabs());

  chrome.runtime.onMessage.addListener(handleMessage);
});
