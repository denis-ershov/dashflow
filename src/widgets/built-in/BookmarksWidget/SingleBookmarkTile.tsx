import React from 'react';
import { ExternalLink, Bookmark } from 'lucide-react';

export interface SingleBookmarkTileProps {
  instanceId: string;
  settings?: {
    singleTitle?: string;
    singleUrl?: string;
    singleIconUrl?: string;
    showTitle?: boolean;
    showIcon?: boolean;
  };
}

export const SingleBookmarkTile: React.FC<SingleBookmarkTileProps> = ({ settings }) => {
  const title = settings?.singleTitle || 'Закладка';
  const url = settings?.singleUrl || 'https://google.com';
  const showTitle = settings?.showTitle !== false;
  const showIcon = settings?.showIcon !== false;

  const getFaviconUrl = (targetUrl: string) => {
    if (settings?.singleIconUrl) return settings.singleIconUrl;
    try {
      const hostname = new URL(targetUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch {
      return '';
    }
  };

  return (
    <div
      onClick={() => (window.location.href = url)}
      className="flex flex-col items-center justify-center h-full w-full p-2 text-center rounded-xl bg-[var(--color-surface)]/70 hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all cursor-pointer group select-none overflow-hidden"
      title={`${title} (${url})`}
    >
      {showIcon && (
        <img
          src={getFaviconUrl(url)}
          alt={title}
          className="w-7 h-7 rounded-lg mb-1 object-contain group-hover:scale-110 transition-transform"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      )}

      {showTitle && (
        <span className="text-[11px] font-semibold text-[var(--color-text)] truncate w-full group-hover:text-[var(--color-primary)] transition-colors">
          {title}
        </span>
      )}
    </div>
  );
};
