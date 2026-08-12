import React, { useEffect, useRef } from 'react';
import { StorageAdapter } from '@/services/storage/StorageAdapter';

export interface PluginHostProps {
  pluginId: string;
  instanceId: string;
  scriptUrl?: string;
}

export const PluginHost: React.FC<PluginHostProps> = ({ pluginId, instanceId, scriptUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (!e.data || e.data.source !== 'dashflow-plugin') return;
      const { type, requestId, key, value } = e.data;

      // Обработка RPC вызовов сторонних плагинов
      if (type === 'STORAGE_GET') {
        const val = await StorageAdapter.get(`plugin_${pluginId}_${key}`, null);
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'dashflow-core', requestId, value: val },
          '*'
        );
      } else if (type === 'STORAGE_SET') {
        await StorageAdapter.set(`plugin_${pluginId}_${key}`, value);
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'dashflow-core', requestId, success: true },
          '*'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pluginId]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl bg-transparent">
      <iframe
        ref={iframeRef}
        title={`Plugin Host ${pluginId}`}
        sandbox="allow-scripts"
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; color: #eefbfb; }
                .card { padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.05); }
              </style>
            </head>
            <body>
              <div class="card">
                <h4 style="margin:0 0 4px 0; font-size: 13px;">Сторонний виджет (${pluginId})</h4>
                <p style="margin:0; font-size: 11px; opacity: 0.7;">Запущен в изолированной песочнице (Sandbox Frame)</p>
              </div>
            </body>
          </html>
        `}
        className="w-full h-full border-0 bg-transparent"
      />
    </div>
  );
};
