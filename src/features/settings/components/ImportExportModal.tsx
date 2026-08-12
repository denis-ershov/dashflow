import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useThemeStore } from '@/features/themes/stores/useThemeStore';
import { useAppStore } from '@/stores/useAppStore';
import { StorageAdapter } from '@/services/storage/StorageAdapter';
import { Button } from '@/components/ui/Button';
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose }) => {
  const { widgets, columns, gap } = useDashboardStore();
  const { activeThemeId, colors, background } = useThemeStore();
  const { language, theme } = useAppStore();

  const [importJson, setImportJson] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExport = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      theme: { activeThemeId, colors, background },
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

      const parsed = JSON.parse(importJson);
      if (!parsed.widgets || !Array.isArray(parsed.widgets)) {
        throw new Error('Некорректный формат JSON файла (отсутствуют виджеты)');
      }

      if (parsed.layout?.columns) {
        await StorageAdapter.set('dash_columns', parsed.layout.columns);
      }
      if (parsed.layout?.gap) {
        await StorageAdapter.set('dash_gap', parsed.layout.gap);
      }
      if (parsed.widgets) {
        await StorageAdapter.set('dash_widgets', parsed.widgets);
      }
      if (parsed.theme) {
        await StorageAdapter.set('theme_colors', parsed.theme.colors);
        await StorageAdapter.set('theme_bg', parsed.theme.background);
      }

      setStatus('success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Ошибка чтения JSON');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Импорт & Экспорт Конфигурации" maxWidth="lg">
      <div className="space-y-6">
        {/* Экспорт */}
        <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
          <h4 className="text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            Экспорт состояния Dashboard
          </h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Сохраните текущее расположение виджетов, сетки и цвета в JSON-файл для перевода на другое устройство.
          </p>
          <Button size="sm" variant="primary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Скачать JSON Конфигурацию
          </Button>
        </div>

        {/* Импорт */}
        <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
          <h4 className="text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            Импорт из JSON
          </h4>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder="Вставьте JSON конфигурацию здесь..."
            className="w-full h-28 bg-[var(--color-surface)] text-xs font-mono text-[var(--color-text)] border border-[var(--color-border)] rounded-xl p-3 focus:outline-none"
          />

          {status === 'success' && (
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Конфигурация импортирована! Перезагрузка...</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center space-x-2 text-red-400 text-xs font-semibold">
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
