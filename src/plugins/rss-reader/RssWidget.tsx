import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { StorageAdapter } from '@/services/storage/StorageAdapter';

export interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  feedName?: string;
  thumbnail?: string;
  description?: string;
}

export type RssViewMode = 'compact' | 'thumbnails' | 'cards' | 'grid';

export interface RssWidgetProps {
  instanceId: string;
  settings?: {
    selectedFeedUrls?: string[];
    viewMode?: RssViewMode;
  };
}

const DEFAULT_URL = 'https://habr.com/ru/rss/best/daily/';

export const RssWidget: React.FC<RssWidgetProps> = ({ settings }) => {
  const selectedFeedUrls = settings?.selectedFeedUrls && settings.selectedFeedUrls.length > 0
    ? settings.selectedFeedUrls
    : [DEFAULT_URL];

  const viewMode = settings?.viewMode || 'thumbnails';

  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMixedFeeds = async () => {
    try {
      setLoading(true);
      const allItems: RssItem[] = [];

      for (const url of selectedFeedUrls) {
        let xmlText = '';

        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          try {
            const response: any = await new Promise((resolve) => {
              chrome.runtime.sendMessage({ type: 'FETCH_RSS_FEED', url }, (res) => {
                resolve(res);
              });
            });
            if (response && response.success && response.xml) {
              xmlText = response.xml;
            }
          } catch (bgErr) {
            console.warn('[RSS] Background fetch error:', bgErr);
          }
        }

        if (!xmlText) {
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl);
            if (res.ok) xmlText = await res.text();
          } catch (e) {
            console.warn('[RSS] Proxy fetch failed:', e);
          }
        }

        if (xmlText) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const channelTitle = xmlDoc.querySelector('channel > title')?.textContent || 'RSS';
          const itemNodes = xmlDoc.querySelectorAll('item');

          itemNodes.forEach((node, idx) => {
            if (idx < 5) {
              const title = node.querySelector('title')?.textContent || 'Без названия';
              const link = node.querySelector('link')?.textContent || '#';
              const pubDate = node.querySelector('pubDate')?.textContent || '';
              const description = node.querySelector('description')?.textContent || '';

              let thumbnail = node.querySelector('enclosure')?.getAttribute('url') || undefined;
              if (!thumbnail && description) {
                const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) thumbnail = imgMatch[1];
              }

              const cleanDesc = description.replace(/<[^>]*>?/gm, '').slice(0, 100);

              allItems.push({
                title,
                link,
                pubDate,
                feedName: channelTitle,
                thumbnail,
                description: cleanDesc,
              });
            }
          });
        }
      }

      // Сортировка новостей по дате или вперемешку
      setItems(allItems);
    } catch (err) {
      console.error('[RSS] Error loading feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMixedFeeds();
  }, [JSON.stringify(selectedFeedUrls)]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Полностью очищенный фронтенд карточки */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)] animate-pulse space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Загрузка свежих новостей...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1">
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {items.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col p-2.5 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)]/60 hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-all overflow-hidden"
              >
                {viewMode === 'thumbnails' && item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-full h-24 object-cover rounded-lg mb-2 border border-[var(--color-border)]/40"
                  />
                )}

                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] line-clamp-2 transition-colors">
                    {item.title}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ml-2 mt-0.5" />
                </div>

                {viewMode === 'cards' && item.description && (
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 line-clamp-2">
                    {item.description}...
                  </p>
                )}

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-[var(--color-border)]/30">
                  <span className="text-[10px] text-[var(--color-secondary)] font-mono truncate max-w-[150px]">
                    {item.feedName}
                  </span>
                  {item.pubDate && (
                    <span className="text-[9px] text-[var(--color-text-muted)]">
                      {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
