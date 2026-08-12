import React from 'react';
import { Globe, RefreshCw } from 'lucide-react';

export interface IframeWidgetProps {
  instanceId: string;
  settings?: {
    url?: string;
    zoom?: number;
  };
}

export const IframeWidget: React.FC<IframeWidgetProps> = ({ settings }) => {
  const url = settings?.url || 'https://wxt.dev';
  const zoom = settings?.zoom || 100;

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden rounded-xl bg-[var(--color-bg)]">
      {!url ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Globe className="w-8 h-8 text-[var(--color-text-muted)] mb-2" />
          <span className="text-xs text-[var(--color-text-muted)]">
            Укажите URL сайта в настройках виджета для отображения страницы
          </span>
        </div>
      ) : (
        <iframe
          src={url}
          title={`Embed ${url}`}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: '0 0',
            width: `${100 * (100 / zoom)}%`,
            height: `${100 * (100 / zoom)}%`,
          }}
          className="border-0 w-full h-full rounded-xl"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      )}
    </div>
  );
};
