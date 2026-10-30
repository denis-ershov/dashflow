import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { isSafeHttpUrl, displayHost } from '@/core/network';
import { useTranslation } from '@/core/i18n';
import type { BookmarkCardStyle, BookmarkSettings } from './types';
import { getBookmarkTileClasses, getBookmarkFallbackGradient } from './bookmarkStyles';

/** Старое поле bgStyle (до cardStyle) → ближайший современный стиль карточки */
const LEGACY_BG_STYLE: Record<NonNullable<BookmarkSettings['bgStyle']>, BookmarkCardStyle> = {
  glass: 'glass',
  accent: 'glow',
  dark: 'solid',
  transparent: 'transparent',
};

export interface SingleBookmarkTileProps {
  instanceId: string;
  settings?: BookmarkSettings;
}

const DEFAULT_SINGLE_URL = 'https://google.com';

export const SingleBookmarkTile: React.FC<SingleBookmarkTileProps> = ({ settings }) => {
  const { t } = useTranslation();
  const title = settings?.singleTitle || t('bookmarks.quickBookmark');
  const rawUrl = settings?.singleUrl;
  const url = rawUrl && isSafeHttpUrl(rawUrl) ? rawUrl : DEFAULT_SINGLE_URL;
  const showTitle = settings?.showTitle !== false;
  const showIcon = settings?.showIcon !== false;
  const showUrl = settings?.showUrl === true;
  const openInNewTab = settings?.openInNewTab !== false;

  const [imgError, setImgError] = React.useState(false);

  const getFaviconUrl = (targetUrl: string) => {
    if (settings?.singleIconUrl && isSafeHttpUrl(settings.singleIconUrl)) return settings.singleIconUrl;
    try {
      const hostname = new URL(targetUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch {
      return '';
    }
  };

  const handleClick = () => {
    if (openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  const classes = getBookmarkTileClasses({
    tileShape: settings?.tileShape || 'square',
    tileSize: settings?.tileSize || 'medium',
    cardStyle: settings?.cardStyle || (settings?.bgStyle && LEGACY_BG_STYLE[settings.bgStyle]) || 'glass',
    borderRadius: settings?.borderRadius || 'md',
    hoverEffect: settings?.hoverEffect || 'scale',
    iconSize: settings?.iconSize || 'medium',
  });

  const firstLetter = (title || 'W').charAt(0).toUpperCase();
  const domain = displayHost(url);
  const gradientClass = getBookmarkFallbackGradient(title || url);

  return (
    <div
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn('relative w-full h-full', classes.containerClass)}
      title={`${title} (${url})`}
    >
      {showIcon && (
        <div className={classes.iconContainerClass}>
          {!imgError ? (
            <img
              src={getFaviconUrl(url)}
              alt={title}
              className={classes.iconImgClass}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={cn(
                'w-full h-full bg-linear-to-br flex items-center justify-center font-bold text-xs shadow-inner select-none',
                gradientClass,
              )}
            >
              {firstLetter}
            </div>
          )}
        </div>
      )}

      {(showTitle || showUrl) && (
        <div className="min-w-0 flex flex-col justify-center">
          {showTitle && <span className={classes.titleClass}>{title}</span>}
          {showUrl && <span className={classes.urlClass}>{domain}</span>}
        </div>
      )}

      <ExternalLink className="w-3.5 h-3.5 text-fg-muted opacity-0 group-hover/tile:opacity-100 absolute top-1.5 right-1.5 transition-opacity" />
    </div>
  );
};
