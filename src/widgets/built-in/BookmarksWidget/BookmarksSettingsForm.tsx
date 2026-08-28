import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useChromeBookmarksStore, BookmarkNode } from '@/services/storage/ChromeBookmarksSync';
import { Button } from '@/ui/primitives';
import type {
  BookmarkSettings,
  BookmarkTileShape,
  BookmarkTileSize,
  BookmarkCardStyle,
  BookmarkBorderRadius,
  BookmarkHoverEffect,
} from './types';
import { cn } from '@/ui/lib/cn';

export interface BookmarksSettingsFormProps {
  instanceId: string;
  onClose: () => void;
}

export const BookmarksSettingsForm: React.FC<BookmarksSettingsFormProps> = ({
  instanceId,
  onClose,
}) => {
  const { instances, updateWidgetSettings } = useDashboardStore();
  const currentWidget = instances.find((w) => w.instanceId === instanceId);
  const settings: BookmarkSettings = (currentWidget?.settings || {}) as BookmarkSettings;

  const { tree, loadTree } = useChromeBookmarksStore();

  const [mode, setMode] = useState<'single' | 'folder' | 'folder-tabs' | 'internal'>(
    settings.mode || 'folder',
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string>(settings.selectedFolderId || 'all');
  const [viewMode, setViewMode] = useState<string>(settings.viewMode || 'tiles');

  // Внешний вид
  const [tileShape, setTileShape] = useState<BookmarkTileShape>(settings.tileShape || 'rectangle-horizontal');
  const [tileSize, setTileSize] = useState<BookmarkTileSize>(settings.tileSize || 'medium');
  const [cardStyle, setCardStyle] = useState<BookmarkCardStyle>(settings.cardStyle || 'glass');
  const [borderRadius, setBorderRadius] = useState<BookmarkBorderRadius>(settings.borderRadius || 'md');
  const [hoverEffect, setHoverEffect] = useState<BookmarkHoverEffect>(settings.hoverEffect || 'scale');
  const [columns, setColumns] = useState<any>(settings.columns || 'auto');

  // Видимость элементов
  const [showTitle, setShowTitle] = useState(settings.showTitle !== false);
  const [showUrl, setShowUrl] = useState(settings.showUrl !== false);
  const [showIcon, setShowIcon] = useState(settings.showIcon !== false);
  const [openInNewTab, setOpenInNewTab] = useState(settings.openInNewTab !== false);
  const [showSearch, setShowSearch] = useState(settings.showSearch !== false);
  const [structureMode, setStructureMode] = useState<'tree' | 'flatten'>(settings.structureMode || 'tree');

  // Одиночная закладка
  const [singleTitle, setSingleTitle] = useState(settings.singleTitle || 'Мой Сайт');
  const [singleUrl, setSingleUrl] = useState(settings.singleUrl || 'https://google.com');
  const [singleIconUrl, setSingleIconUrl] = useState(settings.singleIconUrl || '');

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleSave = () => {
    updateWidgetSettings(instanceId, {
      mode,
      selectedFolderId,
      viewMode,
      tileShape,
      tileSize,
      cardStyle,
      borderRadius,
      hoverEffect,
      columns,
      showTitle,
      showUrl,
      showIcon,
      openInNewTab,
      showSearch,
      structureMode,
      singleTitle,
      singleUrl,
      singleIconUrl,
    });
    onClose();
  };

  const flattenFolders = (nodes: BookmarkNode[]): Array<{ id: string; title: string }> => {
    let folders: Array<{ id: string; title: string }> = [];
    nodes.forEach((n) => {
      if (n.children) {
        folders.push({ id: n.id, title: n.title || 'Папка' });
        folders = folders.concat(flattenFolders(n.children));
      }
    });
    return folders;
  };

  const availableFolders = [{ id: 'all', title: '📁 Все папки закладок' }, ...flattenFolders(tree)];

  return (
    <div className="space-y-4 text-xs text-fg">
      {/* Выбор режима работы виджета */}
      <div>
        <label className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider block mb-1.5">
          Режим Виджета
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="w-full bg-surface text-xs text-fg border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
        >
          <option value="folder">Папка закладок Chrome</option>
          <option value="single">Одиночная плитка (1 сайт = 1 виджет)</option>
          <option value="folder-tabs">Папка сайтов и вкладок (Синхронизация)</option>
        </select>
      </div>

      {/* --- БЛОК ВНЕШНЕГО ВИДА И ФОРМЫ ЗАКЛАДОК --- */}
      <div className="p-3.5 rounded-xl bg-surface/50 border border-line space-y-3.5">
        <span className="text-xs font-bold text-primary block">🎨 Внешний вид и стиль закладок</span>

        {/* Форма плитки */}
        <div>
          <label className="text-[10px] text-fg-muted font-medium block mb-1.5">Форма элементов</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {[
              { id: 'rectangle-horizontal', label: '📱 Горизонтальная' },
              { id: 'square', label: '🔲 Квадратная' },
              { id: 'rectangle-vertical', label: '📄 Вертикальная' },
              { id: 'circle', label: '🔘 Круглая' },
              { id: 'pill', label: '💊 Капсула' },
            ].map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => setTileShape(shape.id as any)}
                className={cn(
                  'p-2 rounded-lg border text-xs text-center transition-all cursor-pointer font-medium',
                  tileShape === shape.id
                    ? 'bg-primary text-primary-fg border-primary shadow-1'
                    : 'bg-surface text-fg hover:bg-surface-hover border-line',
                )}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </div>

        {/* Размер плитки */}
        <div>
          <label className="text-[10px] text-fg-muted font-medium block mb-1.5">Размер карточек</label>
          <div className="grid grid-cols-5 gap-1">
            {[
              { id: 'xs', label: 'Мини' },
              { id: 'compact', label: 'Компакт' },
              { id: 'medium', label: 'Стандарт' },
              { id: 'large', label: 'Крупный' },
              { id: 'xl', label: 'XL' },
            ].map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setTileSize(size.id as any)}
                className={cn(
                  'p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer font-medium',
                  tileSize === size.id
                    ? 'bg-primary text-primary-fg border-primary shadow-1'
                    : 'bg-surface text-fg hover:bg-surface-hover border-line',
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Стиль подложки */}
        <div>
          <label className="text-[10px] text-fg-muted font-medium block mb-1.5">Стиль карточки</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'glass', label: 'Стекло' },
              { id: 'solid', label: 'Плотный' },
              { id: 'outline', label: 'Контур' },
              { id: 'transparent', label: 'Без фона' },
              { id: 'glow', label: 'Свечение' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setCardStyle(st.id as any)}
                className={cn(
                  'p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer font-medium',
                  cardStyle === st.id
                    ? 'bg-primary text-primary-fg border-primary shadow-1'
                    : 'bg-surface text-fg hover:bg-surface-hover border-line',
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Скругление углов */}
        <div>
          <label className="text-[10px] text-fg-muted font-medium block mb-1.5">Скругление углов</label>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { id: 'none', label: '0px' },
              { id: 'sm', label: '8px' },
              { id: 'md', label: '14px' },
              { id: 'lg', label: '20px' },
              { id: 'full', label: 'Full' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setBorderRadius(r.id as any)}
                className={cn(
                  'p-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer font-medium',
                  borderRadius === r.id
                    ? 'bg-primary text-primary-fg border-primary shadow-1'
                    : 'bg-surface text-fg hover:bg-surface-hover border-line',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Колонки в сетке */}
        <div>
          <label className="text-[10px] text-fg-muted font-medium block mb-1.5">Колонки в сетке</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
            {['auto', 1, 2, 3, 4, 5, 6].map((col) => (
              <button
                key={String(col)}
                type="button"
                onClick={() => setColumns(col as any)}
                className={cn(
                  'p-1 rounded-lg border text-xs text-center transition-all cursor-pointer font-medium',
                  String(columns) === String(col)
                    ? 'bg-primary text-primary-fg border-primary shadow-1'
                    : 'bg-surface text-fg hover:bg-surface-hover border-line',
                )}
              >
                {col === 'auto' ? 'Авто' : `${col}к`}
              </button>
            ))}
          </div>
        </div>

        {/* Чекбоксы отображения элементов */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showIcon}
              onChange={(e) => setShowIcon(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
            <span>Иконка / Фавикон</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTitle}
              onChange={(e) => setShowTitle(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
            <span>Название сайта</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUrl}
              onChange={(e) => setShowUrl(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
            <span>Домен / URL</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
            <span>В новой вкладке</span>
          </label>
        </div>
      </div>

      {/* Настройки одиночной закладки */}
      {mode === 'single' && (
        <div className="p-3.5 rounded-xl bg-surface border border-line space-y-2.5">
          <span className="text-xs font-semibold text-fg">Параметры сайта</span>
          <div>
            <label className="text-[10px] text-fg-muted block mb-0.5">Название</label>
            <input
              type="text"
              value={singleTitle}
              onChange={(e) => setSingleTitle(e.target.value)}
              className="w-full bg-surface-hover text-xs text-fg border border-line rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-fg-muted block mb-0.5">URL страницы</label>
            <input
              type="text"
              value={singleUrl}
              onChange={(e) => setSingleUrl(e.target.value)}
              className="w-full bg-surface-hover text-xs text-fg border border-line rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-fg-muted block mb-0.5">URL кастомной иконки (опционально)</label>
            <input
              type="text"
              value={singleIconUrl}
              onChange={(e) => setSingleIconUrl(e.target.value)}
              placeholder="https://.../icon.png"
              className="w-full bg-surface-hover text-xs text-fg border border-line rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Настройки папки */}
      {mode !== 'single' && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider block mb-1.5">
              Папка закладок
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-surface text-xs text-fg border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
            >
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider block mb-1.5">
              Структура папок
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStructureMode('tree')}
                className={cn(
                  'p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer',
                  structureMode === 'tree'
                    ? 'bg-primary text-primary-fg border-primary shadow-1'
                    : 'bg-surface text-fg-muted hover:text-fg border-line',
                )}
              >
                🌲 Иерархическая (с папками)
              </button>
              <button
                type="button"
                onClick={() => setStructureMode('flatten')}
                className={cn(
                  'p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer',
                  structureMode === 'flatten'
                    ? 'bg-primary text-primary-fg border-primary shadow-1'
                    : 'bg-surface text-fg-muted hover:text-fg border-line',
                )}
              >
                📋 Единый плоский список
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <Button size="sm" variant="primary" onClick={handleSave}>
          Применить настройки
        </Button>
      </div>
    </div>
  );
};
