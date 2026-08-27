import React from 'react';
import { ShieldAlert, Globe } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { EmptyState } from '@/ui/feedback';
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

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden bg-surface">
      <iframe
        src={rawUrl}
        title={`Embed ${rawUrl}`}
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: '0 0',
          width: `${100 * (100 / zoom)}%`,
          height: `${100 * (100 / zoom)}%`,
        }}
        className="border-0 w-full h-full"
        // Защита песочницы: запрещен allow-same-origin для предотвращения побега из iframe (ADR-007)
        sandbox="allow-scripts allow-forms allow-popups"
      />
    </div>
  );
};
