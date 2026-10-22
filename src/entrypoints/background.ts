import { defineBackground } from 'wxt/sandbox';

/**
 * Проверка URL на отсутствие признаков SSRF (обращений к локальным/приватным адресам и облачным метаданным)
 */
function isSafeUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Запрет loopback, metadata и приватных доменов/IP
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host === '169.254.169.254' || // AWS/GCP/Azure instance metadata
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost')
    ) {
      return false;
    }

    // Проверка IPv4 приватных сетей: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = host.match(ipv4Regex);
    if (match) {
      const b0 = parseInt(match[1], 10);
      const b1 = parseInt(match[2], 10);
      if (b0 === 10) return false;
      if (b0 === 127) return false;
      if (b0 === 169 && b1 === 254) return false;
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return false;
      if (b0 === 192 && b1 === 168) return false;
      if (b0 === 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export default defineBackground(() => {
  console.log('[DashFlow] Background Service Worker запущен');

  // Клик по иконке расширения в панели Chrome открывает New Tab с DashFlow
  if (typeof chrome !== 'undefined' && chrome.action?.onClicked) {
    chrome.action.onClicked.addListener(() => {
      chrome.tabs.create({});
    });
  }

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

  // Фоновый прокси для безопасного парсинга RSS лент без ограничений CORS с защитой от SSRF
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(
      (message: any, sender, sendResponse: (response?: any) => void) => {
        // Проверка отправителя сообщения (только из нашего собственного расширения)
        if (sender.id && chrome.runtime.id && sender.id !== chrome.runtime.id) {
          sendResponse({ success: false, error: 'Доступ запрещен: чужой отправитель' });
          return false;
        }

        if (message && message.type === 'FETCH_RSS_FEED' && message.url) {
          if (!isSafeUrl(message.url)) {
            sendResponse({ success: false, error: 'Запрещенный адрес запроса (SSRF protection)' });
            return false;
          }

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
      },
    );
  }
});
