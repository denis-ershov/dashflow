import React, { useState } from 'react';
import { ShieldAlert, RotateCcw, ExternalLink, Globe } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { EmptyState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { IframeSettings } from './types';

const isSafeHttpsUrl = (urlStr?: string): boolean => {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const IframeWidget: React.FC<WidgetProps<IframeSettings>> = ({ settings }) => {
  const rawUrl = settings?.url?.trim() || 'https://wxt.dev';
  const zoom = settings?.zoom || 100;
  const title = settings?.title?.trim();
  const showToolbar = settings?.showToolbar !== false;
  const allowScroll = settings?.allowScroll !== false;

  const [reloadKey, setReloadKey] = useState(0);

  if (!rawUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <EmptyState
          title="URL не указан"
          description="Укажите URL сайта в настройках виджета для отображения страницы"
        />
      </div>
    );
  }

  if (!isSafeHttpsUrl(rawUrl)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <ShieldAlert className="w-8 h-8 text-danger mb-2" />
        <h4 className="text-xs font-semibold text-fg mb-1">
          Недопустимый или небезопасный URL
        </h4>
        <p className="text-[11px] text-fg-muted max-w-xs">
          Разрешены только безопасные веб-адреса с протоколом HTTPS или HTTP
        </p>
      </div>
    );
  }

  const handleOpenExternal = () => {
    window.open(rawUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden bg-surface select-none">
      {showToolbar && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated/80 border-b border-line text-xs font-medium text-fg z-10 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
            <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate text-xs font-semibold">
              {title || rawUrl.replace(/^https?:\/\//, '')}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              aria-label="Перезагрузить фрейм"
              className="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleOpenExternal}
              aria-label="Открыть в новой вкладке"
              className="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className={cn('w-full flex-1 relative overflow-hidden', !allowScroll && 'overflow-hidden')}>
        <iframe
          key={reloadKey}
          src={rawUrl}
          title={title || `Embed ${rawUrl}`}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: '0 0',
            width: `${100 * (100 / zoom)}%`,
            height: `${100 * (100 / zoom)}%`,
          }}
          className={cn('border-0 w-full h-full', !allowScroll && 'overflow-hidden')}
          // Защита песочницы: запрещен allow-same-origin для предотвращения побега из iframe (ADR-007)
          sandbox="allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
};
