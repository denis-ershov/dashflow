import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  console.log('[DashFlow] Background Service Worker запущен');

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('[DashFlow] Расширение успешно установлено!');
    }
  });

  // Фоновый прокси для безошибочного парсинга RSS лент без ограничений CORS
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
});
