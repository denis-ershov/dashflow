import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RssWidget } from '@/widgets/built-in/RssWidget/RssWidget';
import { rssManifest } from '@/widgets/built-in/RssWidget/manifest';

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

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockXml),
    } as Response);

    render(<RssWidget instanceId="rss-1" settings={{ feedUrl: 'https://habr.com/rss' }} />);

    await waitFor(() => {
      expect(screen.getByText('Вышел DashFlow 2.0')).toBeInTheDocument();
      expect(screen.getByText('Релиз React 19')).toBeInTheDocument();
    });

    // DashFlow 2.0 (14:00) должен идти раньше React 19 (12:00)
    const titles = screen.getAllByText(/вышел dashflow 2.0|релиз react 19/i);
    expect(titles[0].textContent).toContain('Вышел DashFlow 2.0');
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

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(maliciousXml),
    } as Response);

    render(<RssWidget instanceId="rss-1" settings={{ feedUrl: 'https://test.com/rss' }} />);

    await waitFor(() => {
      expect(screen.getByText('Вредоносная новость')).toBeInTheDocument();
    });

    const linkEl = screen.getByText('Вредоносная новость').closest('a');
    expect(linkEl).toHaveAttribute('href', '#');
  });
});
