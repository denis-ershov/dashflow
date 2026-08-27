import React, { useState } from 'react';
import { Modal } from '@/ui/overlays';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useThemeStore } from '@/core/theme/themeStore';
import { useAppStore } from '@/stores/useAppStore';
import { StorageAdapter } from '@/services/storage/StorageAdapter';
import { Button } from '@/ui/primitives';
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose }) => {
  const { widgets, columns, gap } = useDashboardStore();
  const { activePresetId, wallpaperUrl, scrim, customCss } = useThemeStore();
  const { language, theme } = useAppStore();

  const [importJson, setImportJson] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExport = () => {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      theme: { activePresetId, wallpaperUrl, scrim, customCss },
      layout: { columns, gap },
      widgets,
      settings: { language, theme },
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `dashflow-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    try {
      setStatus('idle');
      setErrorMsg('');

      const parsed = JSON.parse(importJson) as Record<string, unknown>;
      if (!parsed.widgets || !Array.isArray(parsed.widgets)) {
        throw new Error('Некорректный формат JSON файла (отсутствуют виджеты)');
      }

      const layout = parsed.layout as Record<string, unknown> | undefined;
      if (layout?.columns) {
        await StorageAdapter.set('dash_columns', layout.columns);
      }
      if (layout?.gap) {
        await StorageAdapter.set('dash_gap', layout.gap);
      }
      if (parsed.widgets) {
        await StorageAdapter.set('dash_widgets', parsed.widgets);
      }
      if (parsed.theme) {
        useThemeStore.getState().initialize(parsed.theme);
      }

      setStatus('success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Ошибка чтения JSON');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Импорт & Экспорт Конфигурации" maxWidth="lg">
      <div className="space-y-6">
        {/* Экспорт */}
        <div className="p-4 rounded-md bg-canvas border border-line space-y-3">
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Экспорт состояния Dashboard
          </h4>
          <p className="text-xs text-fg-muted">
            Сохраните текущее расположение виджетов, сетки и цвета в JSON-файл для переноса на другое устройство.
          </p>
          <Button size="sm" variant="primary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Скачать JSON Конфигурацию
          </Button>
        </div>

        {/* Импорт */}
        <div className="p-4 rounded-md bg-canvas border border-line space-y-3">
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Импорт из JSON
          </h4>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder="Вставьте JSON конфигурацию здесь..."
            className="w-full h-28 bg-surface text-xs font-mono text-fg border border-line rounded-md p-3 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />

          {status === 'success' && (
            <div className="flex items-center gap-2 text-success text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Конфигурация импортирована! Перезагрузка...</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-danger text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            size="sm"
            variant="secondary"
            icon={<Upload className="w-4 h-4" />}
            disabled={!importJson.trim()}
            onClick={handleImport}
          >
            Применить Импорт
          </Button>
        </div>
      </div>
    </Modal>
  );
};
