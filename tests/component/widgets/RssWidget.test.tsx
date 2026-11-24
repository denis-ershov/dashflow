import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { RssWidget } from '@/widgets/built-in/RssWidget/RssWidget';
import { rssManifest } from '@/widgets/built-in/RssWidget/manifest';
import { itemRepository } from '@/core/items';

describe('RssWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('манифест должен быть строго типизирован и содержать surface=panel', () => {
    expect(rssManifest.id).toBe('rssReader');
    expect(rssManifest.surface).toBe('panel');
    expect(rssManifest.nameKey).toBe('widgets.rssReader');
    expect(rssManifest.permissions).toContain('network');
  });

  it('должен парсить RSS XML и отображать новости в хронологическом порядке', async () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Habr IT</title>
          <item>
            <title>Релиз React 19</title>
            <link>https://habr.com/post/1</link>
            <pubDate>Thu, 27 Aug 2026 12:00:00 GMT</pubDate>
            <description>Подробности релиза React 19</description>
          </item>
          <item>
            <title>Вышел DashFlow 2.0</title>
            <link>https://habr.com/post/2</link>
            <pubDate>Thu, 27 Aug 2026 14:00:00 GMT</pubDate>
            <description>Новый движок тем и контракты</description>
          </item>
        </channel>
      </rss>`;

    vi.spyOn(global, 'fetch').mockImplementation(async () => new Response(mockXml));

    render(
      <RssWidget
        instanceId="rss-1"
        settings={{
          feeds: [
            {
              id: 'habr',
              name: 'Habr',
              url: 'https://habr.com/rss',
              enabled: true,
              folder: 'IT',
            },
          ],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Вышел DashFlow 2.0')).toBeInTheDocument();
      expect(screen.getByText('Релиз React 19')).toBeInTheDocument();
    });

    // DashFlow 2.0 (14:00) должен идти раньше React 19 (12:00)
    const titles = screen.getAllByText(/вышел dashflow 2.0|релиз react 19/i);
    expect(titles[0]?.textContent).toContain('Вышел DashFlow 2.0');
  });

  it('должен фильтровать новости по ключевым словам поиска', async () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Tech News</title>
          <item>
            <title>TypeScript 5.8 Анонсирован</title>
            <link>https://ts.com/58</link>
            <pubDate>Thu, 27 Aug 2026 15:00:00 GMT</pubDate>
          </item>
          <item>
            <title>Python 3.14 Обновление</title>
            <link>https://python.com/314</link>
            <pubDate>Thu, 27 Aug 2026 14:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>`;

    vi.spyOn(global, 'fetch').mockImplementation(async () => new Response(mockXml));

    render(
      <RssWidget
        instanceId="rss-1"
        settings={{
          feeds: [
            {
              id: 'tech',
              name: 'Tech',
              url: 'https://tech.com/rss',
              enabled: true,
            },
          ],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('TypeScript 5.8 Анонсирован')).toBeInTheDocument();
      expect(screen.getByText('Python 3.14 Обновление')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Поиск новостей...');
    fireEvent.change(searchInput, { target: { value: 'TypeScript' } });

    expect(screen.getByText('TypeScript 5.8 Анонсирован')).toBeInTheDocument();
    expect(screen.queryByText('Python 3.14 Обновление')).not.toBeInTheDocument();
  });

  it('должен фильтровать небезопасные ссылки (javascript:, data:)', async () => {
    const maliciousXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Security Test</title>
          <item>
            <title>Вредоносная новость</title>
            <link>javascript:alert('xss')</link>
          </item>
        </channel>
      </rss>`;

    vi.spyOn(global, 'fetch').mockImplementation(async () => new Response(maliciousXml));

    render(
      <RssWidget
        instanceId="rss-1"
        settings={{
          feeds: [
            {
              id: 'sec-test',
              name: 'SecTest',
              url: 'https://test.com/rss',
              enabled: true,
            },
          ],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Вредоносная новость')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Вредоносная новость'));
    expect(within(screen.getByRole('dialog')).queryByRole('link')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('0 непрочитанных статей')).toBeInTheDocument());
  });

  it('открывает описание из ленты и сохраняет статью во «Входящие» один раз', async () => {
    const xml = `<rss><channel><item><title>Читалка</title><link>https://reader.test/one</link>
      <description><![CDATA[<p>Текст из ленты</p><script>скрытое содержимое</script>]]></description>
    </item></channel></rss>`;
    const fetchFeed = vi.spyOn(global, 'fetch').mockImplementation(async () => new Response(xml));
    render(
      <RssWidget instanceId="reader-test" settings={{ feedUrl: 'https://reader.test/rss' }} />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /читалка/i }));
    let reader = within(screen.getByRole('dialog'));
    expect(reader.getByText('Текст из ленты')).toBeInTheDocument();
    expect(reader.queryByText('скрытое содержимое')).not.toBeInTheDocument();
    fireEvent.click(reader.getByRole('button', { name: 'Прочитать позже' }));
    await reader.findByText('Статья сохранена во «Входящих».');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /читалка/i }));
    reader = within(screen.getByRole('dialog'));
    fireEvent.click(reader.getByRole('button', { name: 'Прочитать позже' }));
    await reader.findByText('Эта статья уже сохранена.');
    expect(fetchFeed).toHaveBeenCalledTimes(1);
    expect(await itemRepository.query({ kind: 'article', status: 'inbox' })).toEqual([
      expect.objectContaining({
        title: 'Читалка',
        body: 'Текст из ленты',
        url: 'https://reader.test/one',
      }),
    ]);
  });

  it('виртуализирует 1 000 статей и позволяет перейти к последней с клавиатуры', async () => {
    const entries = Array.from(
      { length: 1_000 },
      (_, index) =>
        `<item><title>Статья №${index + 1}!</title><link>https://long.test/${index}</link></item>`,
    );
    const xml = `<rss><channel>${entries.join('')}</channel></rss>`;
    vi.spyOn(global, 'fetch').mockImplementation(async () => new Response(xml));
    render(
      <RssWidget
        instanceId="virtual-test"
        settings={{ feedUrl: 'https://long.test/rss', itemCount: 1_000 }}
      />,
    );

    const first = await screen.findByRole('button', { name: /статья №1!/i });
    expect(screen.getAllByRole('listitem').length).toBeLessThan(20);
    expect(screen.queryByRole('button', { name: /статья №1000!/i })).not.toBeInTheDocument();
    fireEvent.keyDown(first, { key: 'End' });
    expect(await screen.findByRole('button', { name: /статья №1000!/i })).toHaveFocus();
  });
});
