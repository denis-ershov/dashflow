import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useChromeBookmarksStore, BookmarkNode } from '@/services/storage/ChromeBookmarksSync';
import { Button } from '@/components/ui/Button';

export interface BookmarksSettingsFormProps {
  instanceId: string;
  onClose: () => void;
}

export const BookmarksSettingsForm: React.FC<BookmarksSettingsFormProps> = ({
  instanceId,
  onClose,
}) => {
  const { widgets, updateWidgetSettings } = useDashboardStore();
  const currentWidget = widgets.find((w) => w.instanceId === instanceId);
  const settings = currentWidget?.settings || {};

  const { tree, loadTree } = useChromeBookmarksStore();

  const [mode, setMode] = useState<'single' | 'folder' | 'internal'>(settings.mode || 'folder');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(settings.selectedFolderId || '1');
  const [viewMode, setViewMode] = useState<string>(settings.viewMode || 'tiles');

  // Параметры для одиночной закладки
  const [singleTitle, setSingleTitle] = useState(settings.singleTitle || 'Мой Сайт');
  const [singleUrl, setSingleUrl] = useState(settings.singleUrl || 'https://google.com');
  const [singleIconUrl, setSingleIconUrl] = useState(settings.singleIconUrl || '');
  const [showTitle, setShowTitle] = useState(settings.showTitle !== false);
  const [showIcon, setShowIcon] = useState(settings.showIcon !== false);

  useEffect(() => {
    loadTree();
  }, []);

  const handleSave = () => {
    updateWidgetSettings(instanceId, {
      mode,
      selectedFolderId,
      viewMode,
      singleTitle,
      singleUrl,
      singleIconUrl,
      showTitle,
      showIcon,
    });
    onClose();
  };

  const flattenFolders = (nodes: BookmarkNode[]): Array<{ id: string; title: string }> => {
    let folders: Array<{ id: string; title: string }> = [];
    nodes.forEach((n) => {
      if (n.children) {
        folders.push({ id: n.id, title: n.title });
        folders = folders.concat(flattenFolders(n.children));
      }
    });
    return folders;
  };

  const availableFolders = flattenFolders(tree);

  return (
    <div className="space-y-4">
      {/* Выбор режима работы виджета */}
      <div>
        <label className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider block mb-1.5">
          Режим Виджета Загладок
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus:outline-none"
        >
          <option value="folder">Синхронизированная Папка Браузера Chrome</option>
          <option value="single">Одиночная Закладка (Плитка)</option>
          <option value="internal">Внутренняя Папка Виджета</option>
        </select>
      </div>

      {/* Настройки одиночной закладки */}
      {mode === 'single' && (
        <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
          <span className="text-xs font-semibold text-[var(--color-secondary)]">Параметры Закладки</span>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">Название</label>
            <input
              type="text"
              value={singleTitle}
              onChange={(e) => setSingleTitle(e.target.value)}
              className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">URL страницы</label>
            <input
              type="text"
              value={singleUrl}
              onChange={(e) => setSingleUrl(e.target.value)}
              className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-0.5">URL кастомной иконки (опционально)</label>
            <input
              type="text"
              value={singleIconUrl}
              onChange={(e) => setSingleIconUrl(e.target.value)}
              className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-4 pt-1">
            <label className="flex items-center space-x-2 text-xs text-[var(--color-text)] cursor-pointer">
              <input
                type="checkbox"
                checked={showTitle}
                onChange={(e) => setShowTitle(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--color-primary)]"
              />
              <span>Показывать название</span>
            </label>
            <label className="flex items-center space-x-2 text-xs text-[var(--color-text)] cursor-pointer">
              <input
                type="checkbox"
                checked={showIcon}
                onChange={(e) => setShowIcon(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--color-primary)]"
              />
              <span>Показывать иконку</span>
            </label>
          </div>
        </div>
      )}

      {/* Настройки внешней папки браузера */}
      {mode === 'folder' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider block mb-1.5">
              Корневая папка закладок Chrome
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus:outline-none"
            >
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title || 'Папка ' + f.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider block mb-1.5">
              Стиль отображения (Представление)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tiles', label: 'Плиточная сетка' },
                { id: 'list', label: 'Список' },
                { id: 'table', label: 'Таблица' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setViewMode(style.id)}
                  className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                    viewMode === style.id
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <Button size="sm" variant="primary" onClick={handleSave}>
          Сохранить настройки закладок
        </Button>
      </div>
    </div>
  );
};
