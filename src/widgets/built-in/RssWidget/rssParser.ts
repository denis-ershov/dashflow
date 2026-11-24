import { browser } from 'wxt/browser';
import { parseFeedXml } from '@/core/feeds/parser';
import type { FetchFeed } from '@/core/feeds/refresh';
import type { RssFeedConfig, RssItem } from './types';
import { fetchFeedText, type FetchRssFeedRequest } from '@/core/network/feedProxy';
import { isSafeHttpUrl } from '@/core/network';
import { t, useI18nStore, type SupportedLanguage } from '@/core/i18n';
import { DEFAULT_FOLDER } from './presets';

/** Подписи по умолчанию попадают в данные ленты — берутся на языке интерфейса в момент разбора */
const currentLanguage = () => useI18nStore.getState().language;

export { cleanHtmlText, extractImageFromHtml } from '@/core/feeds/parser';

/**
 * Относительное время публикации: «5 мин. назад», «вчера», дальше — дата.
 * Склонения и формы даёт Intl.RelativeTimeFormat на языке интерфейса.
 */
export function formatRssTimeAgo(
  timestamp?: number,
  pubDateStr?: string,
  lang: SupportedLanguage = 'ru',
): string {
  const time = timestamp || (pubDateStr ? Date.parse(pubDateStr) : 0);
  if (!time || isNaN(time)) return pubDateStr || '';

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const diffMin = Math.floor((Date.now() - time) / 60_000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return t('rss.justNow', undefined, lang);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  if (diffMin < 60) return relative.format(-diffMin, 'minute');
  if (diffHours < 24) return relative.format(-diffHours, 'hour');
  if (diffDays < 7) return relative.format(-diffDays, 'day');
  return new Date(time).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export const fetchArticleFeed: FetchFeed = (url) => {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id) return fetchFeedText(url);
  const request: FetchRssFeedRequest = { type: 'FETCH_RSS_FEED', url };
  return browser.runtime.sendMessage(request);
};

/** Загружает и разбирает один поток RSS или Atom. */
export async function fetchAndParseFeed(
  feed: RssFeedConfig,
  limit = 15,
): Promise<RssItem[]> {
  const response = await fetchArticleFeed(feed.url);
  if (!response.success) throw new Error(response.error);
  return parseRssXml(response.xml, feed, limit);
}

/**
 * Синхронный парсинг сырого XML текста (RSS 2.0 / Atom 1.0 / RDF)
 */
export function parseRssXml(xmlText: string, feed: RssFeedConfig, limit = 15): RssItem[] {
  return parseFeedXml(xmlText, feed, limit);
}

/**
 * Экспорт лент в стандартный формат OPML 2.0 (Outline Processor Markup Language)
 */
export function exportFeedsToOpml(feeds: RssFeedConfig[]): string {
  const foldersMap = new Map<string, RssFeedConfig[]>();

  feeds.forEach((feed) => {
    const folder = feed.folder || DEFAULT_FOLDER;
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
        t('rss.defaultFeedName', undefined, currentLanguage());

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
