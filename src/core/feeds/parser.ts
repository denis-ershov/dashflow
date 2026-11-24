import { DOMParser, onErrorStopParsing, type Element } from '@xmldom/xmldom';
import { FEED_PROXY_LIMITS } from '@/core/network/feedProxy';
import type { RssFeedConfig, RssItem } from '@/widgets/built-in/RssWidget/types';

const mediaNamespace = 'http://search.yahoo.com/mrss/';
const MAX_READER_TEXT = 12_000;
const MAX_ARTICLES_PER_FEED = 1_000;

/** XML парсится одинаково в странице и воркере. Внешние и внутренние DTD запрещены. */
export function readFeedXml(text: string) {
  if (text.length > FEED_PROXY_LIMITS.maxBytes || /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) {
    throw new Error('Invalid feed XML');
  }
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(text, 'application/xml');
}

export function canonicalArticleUrl(value: string, base?: string): string | undefined {
  if (!value.trim() || value.length > 2_048) return;
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
    url.hash = '';
    if (url.href.length <= 2_048) return url.href;
  } catch {
    return;
  }
}

export function extractImageFromHtml(html?: string, base?: string): string | undefined {
  const value = html?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  return value ? canonicalArticleUrl(value, base) : undefined;
}

export function cleanHtmlText(text?: string, maxLen = 160): string {
  if (!text) return '';
  const clean = text
    .slice(0, MAX_READER_TEXT * 3)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:p|div|br|li)\b[^>]*>/gi, ' ')
    .replace(/<[^<>]*>?/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length <= maxLen ? clean : clean.slice(0, maxLen - 1) + '…';
}

function children(parent: Element | null | undefined, name: string): Element[] {
  const result: Element[] = [];
  for (let child = parent?.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1 && (child as Element).localName === name) {
      result.push(child as Element);
    }
  }
  return result;
}

function text(parent: Element | null | undefined, ...names: string[]): string {
  for (const name of names) {
    const value = children(parent, name)[0]?.textContent?.trim();
    if (value) return value;
  }
  return '';
}

function media(node: Element, localName: string) {
  return children(node, localName).find((child) => child.namespaceURI === mediaNamespace);
}

/** Ключ позиции в ленте не используется: порядок и имя подписки могут меняться. */
function articleId(feedUrl: string, link: string | undefined, guid: string, fallback: string) {
  // Стандартный 64-битный FNV-1a. Это компактный ключ истории, не идентификатор доступа.
  const identity = link
    ? JSON.stringify(['url', link])
    : JSON.stringify([feedUrl, guid || fallback]);
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(identity)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return `rss-${hash.toString(16).padStart(16, '0')}`;
}

function article(node: Element, feed: RssFeedConfig, channel: string, atom: boolean): RssItem {
  const title = cleanHtmlText(text(node, 'title'), 500);
  const guid = text(node, atom ? 'id' : 'guid');
  const links = children(node, 'link');
  const selectedLink = atom && links.find((link) => link.getAttribute('rel') === 'alternate');
  const linkNode = selectedLink || links.find((link) => !link.getAttribute('rel'));
  const linkValue = linkNode?.getAttribute('href') || linkNode?.textContent?.trim() || '';
  const link =
    canonicalArticleUrl(linkValue, feed.url) ??
    (/^https?:\/\//i.test(guid) ? canonicalArticleUrl(guid) : undefined);
  const pubDate = text(node, ...(atom ? ['published', 'updated'] : ['pubDate', 'date']));
  const rawDescription = text(
    node,
    ...(atom ? ['content', 'summary'] : ['encoded', 'description']),
  );
  const readerText = cleanHtmlText(rawDescription, MAX_READER_TEXT);
  const enclosure = children(node, 'enclosure')[0];
  const enclosureUrl = enclosure?.getAttribute('url') ?? '';
  const isImage =
    enclosure?.getAttribute('type')?.startsWith('image/') ||
    /\.(?:jpe?g|png|webp|gif)(?:$|[?#])/i.test(enclosureUrl);
  const thumbnail =
    (isImage ? canonicalArticleUrl(enclosureUrl, feed.url) : undefined) ??
    canonicalArticleUrl(media(node, 'content')?.getAttribute('url') ?? '', feed.url) ??
    canonicalArticleUrl(media(node, 'thumbnail')?.getAttribute('url') ?? '', feed.url) ??
    extractImageFromHtml(rawDescription, feed.url);
  const author = atom ? text(children(node, 'author')[0], 'name') : text(node, 'creator', 'author');
  return {
    id: articleId(
      canonicalArticleUrl(feed.url) ?? feed.url,
      link,
      guid,
      JSON.stringify([title, pubDate, readerText.slice(0, 256)]),
    ),
    title,
    link: link ?? '#',
    pubDate,
    timestamp: Date.parse(pubDate) || 0,
    feedId: feed.id,
    feedName: channel || feed.name,
    feedColor: feed.color,
    folder: feed.folder,
    thumbnail,
    description: cleanHtmlText(rawDescription),
    readerText,
    author: author.slice(0, 500),
  };
}

export function parseFeedXml(xmlText: string, feed: RssFeedConfig, limit = 15): RssItem[] {
  const root = readFeedXml(xmlText).documentElement;
  if (!root) return [];
  if (!root.localName || !['rss', 'RDF', 'feed'].includes(root.localName)) {
    throw new Error('Unsupported feed format');
  }
  const atom = root.localName === 'feed';
  const channel = atom ? root : children(root, 'channel')[0];
  const parent = root.localName === 'RDF' ? root : channel;
  const name = text(channel, 'title').slice(0, 500);
  const unique = new Map<string, RssItem>();
  for (const node of children(parent, atom ? 'entry' : 'item')) {
    if (unique.size >= Math.min(limit, MAX_ARTICLES_PER_FEED)) break;
    const item = article(node, feed, name, atom);
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  return [...unique.values()];
}
