import { describe, it, expect } from 'vitest';
import {
  parseRssXml,
  isSafeHttpUrl,
  cleanHtmlText,
  formatRssTimeAgo,
  exportFeedsToOpml,
  parseOpml,
} from '@/widgets/built-in/RssWidget/rssParser';
import type { RssFeedConfig } from '@/widgets/built-in/RssWidget/types';

describe('rssParser utils', () => {
  const dummyFeed: RssFeedConfig = {
    id: 'test-feed',
    name: 'Habr IT',
    url: 'https://habr.com/rss',
    folder: 'IT',
    color: '#65a30d',
    enabled: true,
  };

  it('должен валидировать безопасные HTTP/HTTPS ссылки и отклонять javascript: / data:', () => {
    expect(isSafeHttpUrl('https://habr.com')).toBe(true);
    expect(isSafeHttpUrl('http://example.com/rss.xml')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
  });

  it('должен очищать HTML теги и спецсимволы', () => {
    const raw = '<p>Привет, <b>мир</b>! &amp; &quot;тест&quot;</p>';
    expect(cleanHtmlText(raw)).toBe('Привет, мир! & "тест"');
  });

  it('должен форматировать относительное время на русском', () => {
    const now = Date.now();
    expect(formatRssTimeAgo(now - 1000 * 10)).toBe('только что');
    expect(formatRssTimeAgo(now - 1000 * 60 * 5)).toBe('5 мин назад');
    expect(formatRssTimeAgo(now - 1000 * 60 * 60 * 2)).toBe('2 часа назад');
    expect(formatRssTimeAgo(now - 1000 * 60 * 60 * 24 * 1)).toBe('вчера');
  });

  it('должен парсить RSS 2.0 с enclosure картинками', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Habr Best</title>
          <item>
            <title>Тестовая новость</title>
            <link>https://habr.com/post/100</link>
            <pubDate>Thu, 28 Aug 2026 12:00:00 GMT</pubDate>
            <description>&lt;p&gt;Краткое описание статьи&lt;/p&gt;</description>
            <enclosure url="https://habr.com/img.jpg" type="image/jpeg" />
          </item>
        </channel>
      </rss>`;

    const items = parseRssXml(xml, dummyFeed);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe('Тестовая новость');
    expect(items[0].link).toBe('https://habr.com/post/100');
    expect(items[0].thumbnail).toBe('https://habr.com/img.jpg');
    expect(items[0].description).toBe('Краткое описание статьи');
    expect(items[0].feedName).toBe('Habr Best');
    expect(items[0].folder).toBe('IT');
  });

  it('должен парсить Atom 1.0 формат (<entry>)', () => {
    const atomXml = `<?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Atom Feed</title>
        <entry>
          <title>Atom Entry Title</title>
          <link href="https://atom.example.com/entry/1" rel="alternate" />
          <updated>2026-08-28T10:00:00Z</updated>
          <summary>Atom summary text</summary>
        </entry>
      </feed>`;

    const items = parseRssXml(atomXml, dummyFeed);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe('Atom Entry Title');
    expect(items[0].link).toBe('https://atom.example.com/entry/1');
    expect(items[0].description).toBe('Atom summary text');
  });

  it('должен экспортировать и импортировать OPML подписки', () => {
    const feeds: RssFeedConfig[] = [
      {
        id: 'f1',
        name: 'Habr',
        url: 'https://habr.com/rss',
        folder: 'Tech',
        enabled: true,
      },
      {
        id: 'f2',
        name: 'DTF',
        url: 'https://dtf.ru/rss',
        folder: 'Gaming',
        enabled: true,
      },
    ];

    const opmlText = exportFeedsToOpml(feeds);
    expect(opmlText).toContain('Habr');
    expect(opmlText).toContain('https://habr.com/rss');
    expect(opmlText).toContain('DTF');

    const imported = parseOpml(opmlText);
    expect(imported.length).toBe(2);
    expect(imported.some((f) => f.url === 'https://habr.com/rss')).toBe(true);
    expect(imported.some((f) => f.url === 'https://dtf.ru/rss')).toBe(true);
  });
});
