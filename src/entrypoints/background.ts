import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  console.log('[DashFlow] Background Service Worker запущен');

  // Автоматическое применение обновлений расширения без ожидания закрытия всех вкладок
  if (typeof chrome !== 'undefined' && chrome.runtime?.onUpdateAvailable) {
    chrome.runtime.onUpdateAvailable.addListener((details) => {
      console.log('[DashFlow] Найдено обновление расширения:', details.version);
      chrome.runtime.reload();
    });
  }

  // Событие установки / обновления
  if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('[DashFlow] Расширение успешно установлено!');
      } else if (details.reason === 'update') {
        console.log('[DashFlow] Расширение обновлено до версии:', details.previousVersion);
      }
    });
  }

  // Фоновый прокси для безопасного парсинга RSS лент без ограничений CORS
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse: (response?: any) => void) => {
      if (message && message.type === 'FETCH_RSS_FEED' && message.url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        fetch(message.url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          },
        })
          .then((res) => {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            return res.text();
          })
          .then((xmlText) => {
            sendResponse({ success: true, xml: xmlText });
          })
          .catch((err) => {
            clearTimeout(timeoutId);
            sendResponse({ success: false, error: err.toString() });
          });

        return true;
      }
      return false;
    });
  }
});
