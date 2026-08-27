import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { Skeleton } from '@/ui/feedback/Skeleton';
import { EmptyState, ErrorState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { RssItem, RssSettings } from './types';

const DEFAULT_FEED_URL = 'https://habr.com/ru/rss/best/daily/';

const isSafeHttpUrl = (urlStr?: string): boolean => {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const RssWidget: React.FC<WidgetProps<RssSettings>> = ({ settings }) => {
  const feedUrls = settings?.feedUrls && settings.feedUrls.length > 0
    ? settings.feedUrls
    : [settings?.feedUrl || DEFAULT_FEED_URL];

  const viewMode = settings?.viewMode || 'thumbnails';

  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      setError(null);
      const allItems: RssItem[] = [];

      for (const url of feedUrls) {
        let xmlText = '';

        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          try {
            const response = await new Promise<{ success?: boolean; xml?: string }>((resolve) => {
              chrome.runtime.sendMessage({ type: 'FETCH_RSS_FEED', url }, (res) => {
                resolve(res || {});
              });
            });
            if (response && response.success && response.xml) {
              xmlText = response.xml;
            }
          } catch {
            // Фолбэк на прямой fetch
          }
        }

        if (!xmlText) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              xmlText = await res.text();
            }
          } catch {
            // Пропуск сбойного фида
          }
        }

        if (xmlText) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const channelTitle = xmlDoc.querySelector('channel > title')?.textContent || 'RSS';
          const itemNodes = xmlDoc.querySelectorAll('item');

          itemNodes.forEach((node, idx) => {
            if (idx < 10) {
              const title = node.querySelector('title')?.textContent || 'Без названия';
              const rawLink = node.querySelector('link')?.textContent || '';
              const link = isSafeHttpUrl(rawLink) ? rawLink : '#';
              const pubDate = node.querySelector('pubDate')?.textContent || '';
              const description = node.querySelector('description')?.textContent || '';

              let thumbnail = node.querySelector('enclosure')?.getAttribute('url') || undefined;
              if (!thumbnail && description) {
                const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch && isSafeHttpUrl(imgMatch[1])) {
                  thumbnail = imgMatch[1];
                }
              }

              const cleanDesc = description.replace(/<[^>]*>?/gm, '').slice(0, 120);
              const timestamp = pubDate ? Date.parse(pubDate) || 0 : 0;

              allItems.push({
                title,
                link,
                pubDate,
                timestamp,
                feedName: channelTitle,
                thumbnail,
                description: cleanDesc,
              });
            }
          });
        }
      }

      // Единый хронологический поток (Spec Секция 9)
      allItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setItems(allItems);
    } catch (err) {
      setError('Не удалось загрузить RSS ленту');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, [JSON.stringify(feedUrls)]);

  if (loading && items.length === 0) {
    return (
      <div className="p-3 space-y-3">
        <Skeleton className="w-full h-16 rounded-lg" />
        <Skeleton className="w-full h-16 rounded-lg" />
        <Skeleton className="w-full h-16 rounded-lg" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center">
        <ErrorState
          title="Ошибка RSS"
          message={error}
          onRetry={loadFeeds}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center">
        <EmptyState
          title="Нет новостей"
          description="В выбранных RSS лентах пока нет публикаций"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-2 select-none overflow-y-auto">
      <div className="space-y-2">
        {items.map((item, idx) => (
          <a
            key={`${item.link}-${idx}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="group flex flex-col p-2.5 rounded-lg bg-surface/70 border border-line/60 hover:border-primary hover:bg-surface-hover transition-all overflow-hidden"
          >
            {viewMode === 'thumbnails' && item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-24 object-cover rounded-md mb-2 border border-line/40"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}

            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-fg group-hover:text-primary line-clamp-2 transition-colors">
                {item.title}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-fg-muted shrink-0 mt-0.5" />
            </div>

            {viewMode === 'cards' && item.description && (
              <p className="text-[11px] text-fg-muted mt-1 line-clamp-2">
                {item.description}...
              </p>
            )}

            <div className="flex items-center justify-between mt-2 pt-1 border-t border-line/30 text-[10px]">
              <span className="text-secondary font-mono truncate max-w-[140px]">
                {item.feedName}
              </span>
              {item.pubDate && (
                <span className="text-fg-muted">
                  {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
