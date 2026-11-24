import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '@/ui/overlays';
import { useDashboardStore, pickPersistedDashboard } from '@/stores/useDashboardStore';
import { useThemeStore } from '@/core/theme/themeStore';
import { useAppStore } from '@/stores/useAppStore';
import { isSupportedLanguage, useTranslation } from '@/core/i18n';
import {
  StorageAdapter,
  STORAGE_KEYS,
  collectUserContent,
  exportDashboardSnapshot,
  migrateDashboardSnapshot,
  restoreUserContent,
} from '@/core/storage';
import { Button } from '@/ui/primitives';
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { runLogged } from '@/core/observability';

/** Хранилище Item и код файла экспорта нужны редко — загружаются по нажатию, не в главный чанк */
const loadBackup = async () => {
  const [{ itemRepository }, backup] = await Promise.all([
    import('@/core/items'),
    import('../backupFile'),
  ]);
  return { itemRepository, ...backup };
};

export interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { activePresetId, wallpaperUrl, scrim, customCss } = useThemeStore(
    useShallow((s) => ({
      activePresetId: s.activePresetId,
      wallpaperUrl: s.wallpaperUrl,
      scrim: s.scrim,
      customCss: s.customCss,
    })),
  );
  const language = useAppStore((state) => state.language);

  const [importJson, setImportJson] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExport = async () => {
    const { ensureWorkspaceReady } = await import('@/features/workspace/bindings');
    await ensureWorkspaceReady();
    const snapshot = pickPersistedDashboard(useDashboardStore.getState());
    const { itemRepository, exportWorkspaceItems, EXPORT_VERSION } = await loadBackup();
    const workspace = await exportWorkspaceItems(itemRepository);
    const data = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      theme: { activePresetId, wallpaperUrl, scrim, customCss },
      dashboard: exportDashboardSnapshot(snapshot),
      settings: { language },
      // Задачи, заметки, ссылки и доски рабочего пространства (с 3.0)
      items: workspace.items,
      boards: workspace.boards,
      content: await collectUserContent(
        snapshot.spaces.flatMap((space) => space.instances.map(({ instanceId }) => instanceId)),
        ['habits'],
      ),
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

      const raw: unknown = JSON.parse(importJson);
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new Error(t('backup.invalidFormat'));
      }
      const parsed = raw as Record<string, unknown>;

      const rawDashboard = parsed.dashboard || parsed;
      const hasDashboardData = Boolean(
        parsed.dashboard ||
          (Array.isArray(parsed.widgets) && parsed.widgets.length > 0) ||
          Array.isArray(parsed.instances) ||
          Array.isArray(parsed.spaces) ||
          parsed.layout,
      );

      const migrated = hasDashboardData
        ? migrateDashboardSnapshot(rawDashboard)
        : null;
      const spaces = migrated?.spaces ?? useDashboardStore.getState().spaces;
      const instances = spaces.flatMap((space) => space.instances);

      // Записи до раскладки: файлу 2.x нужны экземпляры виджетов, чтобы привязать к ним доски
      const { itemRepository, importWorkspaceItems, applyItemsMapping } = await loadBackup();
      const imported = await importWorkspaceItems({
        file: parsed,
        repository: itemRepository,
        instances,
        language: useAppStore.getState().language,
      });
      const linkedSpaces = spaces.map((space) => ({
        ...space, instances: applyItemsMapping(space.instances, imported.mapping),
      }));

      if (migrated) {
        const state = { ...migrated, spaces: linkedSpaces };
        // Пишем напрямую в формате zustand persist: перезагрузка ниже не должна обогнать асинхронный persist
        await StorageAdapter.set(STORAGE_KEYS.DASHBOARD, { state, version: 3 });
        useDashboardStore.setState(state);
      } else if (Object.keys(imported.mapping).length > 0) {
        useDashboardStore.setState({ spaces: linkedSpaces });
      }

      if (parsed.theme) {
        useThemeStore.getState().initialize(parsed.theme);
      }

      // Файлы до версии 2.2 содержимого не содержат — тогда ничего не трогаем
      if (parsed.content !== undefined) {
        await restoreUserContent(parsed.content, ['habits']);
      }

      if (parsed.settings && typeof parsed.settings === 'object') {
        const settings = parsed.settings as Record<string, unknown>;
        if (isSupportedLanguage(settings.language)) {
          await useAppStore.getState().setLanguage(settings.language);
        }
      }

      setStatus('success');
      setTimeout(() => window.location.reload(), 800);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof SyntaxError || !(err instanceof Error) ? t('backup.readError') : err.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('backup.title')} maxWidth="lg">
      <div className="space-y-6">
        {/* Экспорт */}
        <div className="p-4 rounded-md bg-canvas border border-line space-y-3">
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            {t('backup.exportTitle')}
          </h4>
          <p className="text-xs text-fg-muted">
            {t('backup.exportDesc')}
          </p>
          <Button size="sm" variant="primary" icon={<Download className="w-4 h-4" />} onClick={() => runLogged(handleExport().catch(() => {
            setStatus('error');
            setErrorMsg(t('backup.exportError'));
          }), 'storage')}>
            {t('backup.download')}
          </Button>
        </div>

        {/* Импорт */}
        <div className="p-4 rounded-md bg-canvas border border-line space-y-3">
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            {t('backup.importTitle')}
          </h4>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={t('backup.importPlaceholder')}
            className="w-full h-28 bg-surface text-xs font-mono text-fg border border-line rounded-md p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />

          {status === 'success' && (
            <div className="flex items-center gap-2 text-success text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('backup.successReload')}</span>
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
            onClick={() => runLogged(handleImport(), 'storage')}
          >
            {t('backup.apply')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
