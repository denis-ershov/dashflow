import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import type { BookmarkSettings } from './types';
import { getBookmarkTileClasses, getBookmarkFallbackGradient } from './bookmarkStyles';

export interface SingleBookmarkTileProps {
  instanceId: string;
  settings?: BookmarkSettings;
}

export const SingleBookmarkTile: React.FC<SingleBookmarkTileProps> = ({ settings }) => {
  const title = settings?.singleTitle || 'Быстрая закладка';
  const url = settings?.singleUrl || 'https://google.com';
  const showTitle = settings?.showTitle !== false;
  const showIcon = settings?.showIcon !== false;
  const showUrl = settings?.showUrl === true;
  const openInNewTab = settings?.openInNewTab !== false;

  const [imgError, setImgError] = React.useState(false);

  const getFaviconUrl = (targetUrl: string) => {
    if (settings?.singleIconUrl) return settings.singleIconUrl;
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
    cardStyle: settings?.cardStyle || (settings?.bgStyle as any) || 'glass',
    borderRadius: settings?.borderRadius || 'md',
    hoverEffect: settings?.hoverEffect || 'scale',
    iconSize: settings?.iconSize || 'medium',
  });

  const firstLetter = (title || 'W').charAt(0).toUpperCase();
  const domain = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
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
                'w-full h-full bg-gradient-to-br flex items-center justify-center font-bold text-xs shadow-inner select-none',
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
