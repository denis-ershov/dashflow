import type { RssFeedConfig, RssItem } from './types';

export const isSafeHttpUrl = (urlStr?: string): boolean => {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Извлечение первого валидного URL изображения из HTML-текста описания
 */
export function extractImageFromHtml(html?: string): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && isSafeHttpUrl(match[1])) {
    return match[1];
  }
  return undefined;
}

/**
 * Очистка HTML тегов и избыточных пробелов
 */
export function cleanHtmlText(text?: string, maxLen = 160): string {
  if (!text) return '';
  const clean = text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen) + '…';
}

/**
 * Форматирование относительного времени публикации новости на русском языке
 */
export function formatRssTimeAgo(timestamp?: number, pubDateStr?: string): string {
  const time = timestamp || (pubDateStr ? Date.parse(pubDateStr) : 0);
  if (!time || isNaN(time)) return pubDateStr || '';

  const now = Date.now();
  const diffMs = now - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'только что';
  if (diffMin < 60) {
    if (diffMin % 10 === 1 && diffMin !== 11) return `${diffMin} мин назад`;
    if ([2, 3, 4].includes(diffMin % 10) && ![12, 13, 14].includes(diffMin)) return `${diffMin} мин назад`;
    return `${diffMin} мин назад`;
  }
  if (diffHours < 24) {
    if (diffHours === 1 || diffHours === 21) return `${diffHours} час назад`;
    if ([2, 3, 4, 22, 23, 24].includes(diffHours)) return `${diffHours} часа назад`;
    return `${diffHours} часов назад`;
  }
  if (diffDays === 1) return 'вчера';
  if (diffDays < 7) return `${diffDays} дн назад`;

  const dateObj = new Date(time);
  return dateObj.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
}

/**
 * Загрузка и парсинг одного RSS или Atom потока
 */
export async function fetchAndParseFeed(
  feed: RssFeedConfig,
  limit = 15,
): Promise<RssItem[]> {
  let xmlText = '';

  // 1. Попытка запроса через Background Service Worker (обход CORS)
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response = await new Promise<{ success?: boolean; xml?: string }>((resolve) => {
        chrome.runtime.sendMessage({ type: 'FETCH_RSS_FEED', url: feed.url }, (res) => {
          resolve(res || {});
        });
      });
      if (response && response.success && response.xml) {
        xmlText = response.xml;
      }
    } catch {
      // Игнорируем и переходим к прямому fetch
    }
  }

  // 2. Фолбэк на прямой fetch
  if (!xmlText) {
    const res = await fetch(feed.url);
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    xmlText = await res.text();
  }

  return parseRssXml(xmlText, feed, limit);
}

/**
 * Синхронный парсинг сырого XML текста (RSS 2.0 / Atom 1.0 / RDF)
 */
export function parseRssXml(
  xmlText: string,
  feed: RssFeedConfig,
  limit = 15,
): RssItem[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Проверка на ошибку парсинга
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML parsing failed');
  }

  const items: RssItem[] = [];

  // 1. Пробуем формат RSS 2.0 (<item>)
  const rssItems = xmlDoc.querySelectorAll('item');
  if (rssItems.length > 0) {
    const channelTitle =
      xmlDoc.querySelector('channel > title')?.textContent?.trim() || feed.name;

    rssItems.forEach((node, idx) => {
      if (idx >= limit) return;

      const title = node.querySelector('title')?.textContent?.trim() || 'Без названия';
      const rawLink =
        node.querySelector('link')?.textContent?.trim() ||
        node.querySelector('guid')?.textContent?.trim() ||
        '';
      const link = isSafeHttpUrl(rawLink) ? rawLink : '#';
      const pubDate =
        node.querySelector('pubDate')?.textContent?.trim() ||
        node.querySelector('dc\\:date, date')?.textContent?.trim() ||
        '';
      const description =
        node.querySelector('description')?.textContent ||
        node.querySelector('content\\:encoded')?.textContent ||
        '';

      // Поиск миниатюры
      let thumbnail: string | undefined = undefined;
      const enclosure = node.querySelector('enclosure');
      if (enclosure) {
        const encUrl = enclosure.getAttribute('url');
        const encType = enclosure.getAttribute('type') || '';
        if (encUrl && (encType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)/i.test(encUrl))) {
          if (isSafeHttpUrl(encUrl)) thumbnail = encUrl;
        }
      }

      if (!thumbnail) {
        const mediaContent = node.querySelector('media\\:content, content');
        const mediaUrl = mediaContent?.getAttribute('url');
        if (mediaUrl && isSafeHttpUrl(mediaUrl)) {
          thumbnail = mediaUrl;
        }
      }

      if (!thumbnail) {
        const mediaThumb = node.querySelector('media\\:thumbnail, thumbnail');
        const thumbUrl = mediaThumb?.getAttribute('url');
        if (thumbUrl && isSafeHttpUrl(thumbUrl)) {
          thumbnail = thumbUrl;
        }
      }

      if (!thumbnail) {
        thumbnail = extractImageFromHtml(description);
      }

      const timestamp = pubDate ? Date.parse(pubDate) || 0 : 0;
      const author =
        node.querySelector('author')?.textContent?.trim() ||
        node.querySelector('dc\\:creator')?.textContent?.trim();

      items.push({
        id: `${feed.id}-${link}-${idx}`,
        title,
        link,
        pubDate,
        timestamp,
        feedId: feed.id,
        feedName: channelTitle || feed.name,
        feedColor: feed.color,
        folder: feed.folder,
        thumbnail,
        description: cleanHtmlText(description),
        author,
      });
    });

    return items;
  }

  // 2. Пробуем формат Atom 1.0 (<entry>)
  const atomEntries = xmlDoc.querySelectorAll('entry');
  if (atomEntries.length > 0) {
    const feedTitle =
      xmlDoc.querySelector('feed > title')?.textContent?.trim() || feed.name;

    atomEntries.forEach((node, idx) => {
      if (idx >= limit) return;

      const title = node.querySelector('title')?.textContent?.trim() || 'Без названия';

      // Ссылка в Atom часто хранится как <link href="..." rel="alternate" />
      let rawLink = '';
      const linkAlt = node.querySelector('link[rel="alternate"]');
      if (linkAlt) {
        rawLink = linkAlt.getAttribute('href') || '';
      } else {
        const linkNode = node.querySelector('link');
        rawLink = linkNode?.getAttribute('href') || linkNode?.textContent?.trim() || '';
      }

      const link = isSafeHttpUrl(rawLink) ? rawLink : '#';
      const pubDate =
        node.querySelector('published')?.textContent?.trim() ||
        node.querySelector('updated')?.textContent?.trim() ||
        '';

      const summary =
        node.querySelector('summary')?.textContent ||
        node.querySelector('content')?.textContent ||
        '';

      let thumbnail: string | undefined = undefined;
      const mediaThumb = node.querySelector('media\\:thumbnail, thumbnail');
      const thumbUrl = mediaThumb?.getAttribute('url');
      if (thumbUrl && isSafeHttpUrl(thumbUrl)) {
        thumbnail = thumbUrl;
      }

      if (!thumbnail) {
        thumbnail = extractImageFromHtml(summary);
      }

      const timestamp = pubDate ? Date.parse(pubDate) || 0 : 0;
      const author = node.querySelector('author > name')?.textContent?.trim();

      items.push({
        id: `${feed.id}-${link}-${idx}`,
        title,
        link,
        pubDate,
        timestamp,
        feedId: feed.id,
        feedName: feedTitle || feed.name,
        feedColor: feed.color,
        folder: feed.folder,
        thumbnail,
        description: cleanHtmlText(summary),
        author,
      });
    });

    return items;
  }

  return items;
}

/**
 * Экспорт лент в стандартный формат OPML 2.0 (Outline Processor Markup Language)
 */
export function exportFeedsToOpml(feeds: RssFeedConfig[]): string {
  const foldersMap = new Map<string, RssFeedConfig[]>();

  feeds.forEach((feed) => {
    const folder = feed.folder || 'Общие';
    if (!foldersMap.has(folder)) {
      foldersMap.set(folder, []);
    }
    foldersMap.get(folder)!.push(feed);
  });

  let outlines = '';
  foldersMap.forEach((feedList, folderName) => {
    outlines += `    <outline text="${escapeXml(folderName)}" title="${escapeXml(folderName)}">\n`;
    feedList.forEach((f) => {
      outlines += `      <outline type="rss" text="${escapeXml(f.name)}" title="${escapeXml(f.name)}" xmlUrl="${escapeXml(f.url)}" htmlUrl="${escapeXml(f.url)}" />\n`;
    });
    outlines += `    </outline>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>DashFlow RSS Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${outlines}  </body>
</opml>`;
}

/**
 * Импорт лент из OPML XML документа
 */
export function parseOpml(opmlText: string): RssFeedConfig[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(opmlText, 'text/xml');
  const feeds: RssFeedConfig[] = [];

  const outlines = xmlDoc.querySelectorAll('outline');
  outlines.forEach((outline) => {
    const xmlUrl = outline.getAttribute('xmlUrl') || outline.getAttribute('url');
    if (xmlUrl && isSafeHttpUrl(xmlUrl)) {
      const name =
        outline.getAttribute('text') ||
        outline.getAttribute('title') ||
        'RSS Лента';

      // Если родительский узел — тоже outline, это папка
      const parentOutline = outline.parentElement?.closest('outline');
      const folder = parentOutline
        ? parentOutline.getAttribute('text') || parentOutline.getAttribute('title') || undefined
        : undefined;

      feeds.push({
        id: `feed-opml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        url: xmlUrl,
        folder,
        enabled: true,
      });
    }
  });

  return feeds;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
