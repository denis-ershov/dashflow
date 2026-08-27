import React, { useEffect, useRef } from 'react';
import { SandboxBridge } from '@/core/plugins/SandboxBridge';

export interface PluginHostProps {
  pluginId: string;
  instanceId: string;
  templateHtml?: string;
}

export const PluginHost: React.FC<PluginHostProps> = ({
  pluginId,
  instanceId,
  templateHtml,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      const response = await SandboxBridge.handleMessage(
        e,
        pluginId,
        iframeRef.current?.contentWindow || null,
      );

      if (response && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(response, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pluginId]);

  const defaultHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9; background: transparent; }
          .card { padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
          h4 { margin: 0 0 6px 0; font-size: 13px; font-weight: 600; }
          p { margin: 0; font-size: 11px; opacity: 0.75; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="card">
          <h4>Плагин: ${pluginId}</h4>
          <p>Запущен в изолированной песочнице (Sandbox Frame, instance: ${instanceId})</p>
        </div>
      </body>
    </html>
  `;

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl bg-transparent select-none">
      <iframe
        ref={iframeRef}
        title={`Plugin Host ${pluginId}`}
        sandbox="allow-scripts"
        srcDoc={templateHtml || defaultHtml}
        className="w-full h-full border-0 bg-transparent"
      />
    </div>
  );
};
