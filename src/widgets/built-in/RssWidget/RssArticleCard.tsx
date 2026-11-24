import { Rss } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import { cn } from '@/ui/lib/cn';
import { formatRssTimeAgo } from './rssParser';
import type { RssItem, RssViewMode } from './types';

export interface ArticleAppearance {
  viewMode: RssViewMode;
  cardClass: string;
  badgeClass: string;
  showThumbnails: boolean;
  showDescription: boolean;
  showSource: boolean;
  showDate: boolean;
}

interface Props extends ArticleAppearance {
  item: RssItem;
  index: number;
  count: number;
  unread: boolean;
  onOpen: (item: RssItem) => void;
}

export function RssArticleCard({
  item, index, count, unread, onOpen, viewMode, cardClass, badgeClass,
  showThumbnails, showDescription, showSource, showDate,
}: Props) {
  const { t, language } = useTranslation();
  const compact = viewMode === 'compact';
  const hero = viewMode === 'magazine' && index === 0;
  const largeImage = showThumbnails && item.thumbnail && (viewMode === 'cards' || hero);
  const smallImage = showThumbnails && item.thumbnail && viewMode === 'thumbnails';
  const title = item.title || t('rss.untitled');
  const date = showDate ? formatRssTimeAgo(item.timestamp, item.pubDate, language) : '';
  const description = showDescription && !compact ? item.description : '';

  return (
    <div role="listitem" aria-posinset={index + 1} aria-setsize={count} className="min-w-0">
      <button
        type="button"
        className={cn(
          cardClass,
          'block min-h-11 w-full min-w-0 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
          hero && 'bg-surface-hover/80 border-primary/40',
        )}
        aria-haspopup="dialog"
        data-rss-position={index}
        onClick={() => onOpen(item)}
      >
        {(largeImage || smallImage) && (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className={cn(
              'rounded-lg border border-line/40 bg-surface-hover object-cover',
              smallImage ? 'float-start me-3 size-20' : 'mb-2 h-36 w-full',
            )}
            onError={(event) => { event.currentTarget.hidden = true; }}
          />
        )}
        <div className={cn('min-w-0 space-y-1', compact && 'flex items-center gap-2 space-y-0')}>
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {unread
              ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"><span className="sr-only">{t('rss.unread')}</span></span>
              : compact && <Rss aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />}
            <span className={cn('min-w-0 line-clamp-2 text-xs text-fg wrap-anywhere group-hover/item:text-primary', unread && 'font-semibold')}>
              {title}
            </span>
          </div>
          {description && <p className="line-clamp-2 text-xs text-fg-muted wrap-anywhere">{description}</p>}
          {(showSource && item.feedName || date) && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-fg-muted">
              {showSource && item.feedName && (
                <span className={cn(badgeClass, 'max-w-full')}>
                  {item.feedColor && (
                    <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.feedColor }} />
                  )}
                  <span className="truncate">{item.feedName}</span>
                </span>
              )}
              {date && <time dateTime={item.timestamp ? new Date(item.timestamp).toISOString() : undefined}>{date}</time>}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
