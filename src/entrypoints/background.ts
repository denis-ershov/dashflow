import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  console.log('[DashFlow] Background Service Worker запущен');

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('[DashFlow] Расширение успешно установлено!');
    }
  });

  // Фоновый прокси для безошибочного парсинга RSS лент без ограничений CORS
  browser.runtime.onMessage.addListener((message: any, sender, sendResponse: any) => {
    if (message && message.type === 'FETCH_RSS_FEED' && message.url) {
      fetch(message.url)
        .then((res) => res.text())
        .then((xmlText) => {
          sendResponse({ success: true, xml: xmlText });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.toString() });
        });
      return true;
    }
    return true;
  });
});
