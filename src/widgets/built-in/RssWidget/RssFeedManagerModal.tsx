import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Folder,
  Rss,
  Download,
  Upload,
  Check,
  Globe,
  Tag,
  Palette,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/ui/overlays/Modal';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Switch } from '@/ui/primitives/Switch';
import { cn } from '@/ui/lib/cn';
import type { RssFeedConfig } from './types';
import { RSS_PRESET_CATEGORIES } from './presets';
import { exportFeedsToOpml, parseOpml, isSafeHttpUrl } from './rssParser';

export interface RssFeedManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeds: RssFeedConfig[];
  onSaveFeeds: (newFeeds: RssFeedConfig[]) => void;
}

const FEED_COLORS = [
  '#65a30d', // lime
  '#16a34a', // green
  '#0284c7', // sky
  '#2563eb', // blue
  '#7c3aed', // violet
  '#c026d3', // fuchsia
  '#e11d48', // rose
  '#ea580c', // orange
  '#d97706', // amber
  '#64748b', // slate
];

export const RssFeedManagerModal: React.FC<RssFeedManagerModalProps> = ({
  isOpen,
  onClose,
  feeds,
  onSaveFeeds,
}) => {
  const [activeTab, setActiveTab] = useState<'my-feeds' | 'presets' | 'add' | 'opml'>('my-feeds');

  // Form states for manual add
  const [feedName, setFeedName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedFolder, setFeedFolder] = useState('Общие');
  const [feedColor, setFeedColor] = useState(FEED_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter/search in modal
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFeedEnabled = (id: string) => {
    const updated = feeds.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f));
    onSaveFeeds(updated);
  };

  const deleteFeed = (id: string) => {
    const updated = feeds.filter((f) => f.id !== id);
    onSaveFeeds(updated);
  };

  const addCustomFeed = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUrl = feedUrl.trim();
    const trimmedName = feedName.trim();

    if (!trimmedUrl || !isSafeHttpUrl(trimmedUrl)) {
      setFormError('Введите корректный URL адрес (начинающийся с https:// или http://)');
      return;
    }

    if (feeds.some((f) => f.url.toLowerCase() === trimmedUrl.toLowerCase())) {
      setFormError('Лента с таким URL адресом уже добавлена');
      return;
    }

    const newFeed: RssFeedConfig = {
      id: `feed-custom-${Date.now()}`,
      name: trimmedName || trimmedUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0],
      url: trimmedUrl,
      folder: feedFolder.trim() || 'Общие',
      enabled: true,
      color: feedColor,
    };

    onSaveFeeds([...feeds, newFeed]);
    setFeedName('');
    setFeedUrl('');
    setActiveTab('my-feeds');
  };

  const addPresetFeed = (preset: RssFeedConfig) => {
    if (feeds.some((f) => f.url.toLowerCase() === preset.url.toLowerCase())) {
      return;
    }
    onSaveFeeds([...feeds, { ...preset, enabled: true }]);
  };

  const handleExportOpml = () => {
    const opmlString = exportFeedsToOpml(feeds);
    const blob = new Blob([opmlString], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashflow-rss-feeds-${new Date().toISOString().slice(0, 10)}.opml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportOpml = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        try {
          const imported = parseOpml(content);
          if (imported.length === 0) {
            alert('В выбранном файле не найдено RSS-лент.');
            return;
          }
          // Объединяем, исключая дубликаты по URL
          const existingUrls = new Set(feeds.map((f) => f.url.toLowerCase()));
          const newUnique = imported.filter((f) => !existingUrls.has(f.url.toLowerCase()));
          onSaveFeeds([...feeds, ...newUnique]);
          alert(`Успешно импортировано ${newUnique.length} новых RSS-лент!`);
          setActiveTab('my-feeds');
        } catch {
          alert('Ошибка при разборе OPML-файла');
        }
      }
    };
    reader.readAsText(file);
  };

  // Группировка лент по папкам
  const foldersMap = React.useMemo(() => {
    const map = new Map<string, RssFeedConfig[]>();
    feeds.forEach((feed) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          feed.name.toLowerCase().includes(q) ||
          feed.url.toLowerCase().includes(q) ||
          (feed.folder && feed.folder.toLowerCase().includes(q));
        if (!matches) return;
      }

      const folder = feed.folder || 'Общие';
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(feed);
    });
    return map;
  }, [feeds, searchQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Управление RSS-лентами"
      maxWidth="xl"
      className="max-h-[85vh] flex flex-col"
    >
      {/* Навигационные табы внутри модального окна */}
      <div className="flex border-b border-line bg-surface-hover/40 px-3 pt-2 gap-1 overflow-x-auto select-none shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('my-feeds')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer',
            activeTab === 'my-feeds'
              ? 'text-primary border-primary bg-surface shadow-sm'
              : 'text-fg-muted border-transparent hover:text-fg hover:bg-surface/50',
          )}
        >
          <Rss className="w-3.5 h-3.5" />
          Мои ленты ({feeds.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer',
            activeTab === 'presets'
              ? 'text-primary border-primary bg-surface shadow-sm'
              : 'text-fg-muted border-transparent hover:text-fg hover:bg-surface/50',
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Каталог источников
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('add')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer',
            activeTab === 'add'
              ? 'text-primary border-primary bg-surface shadow-sm'
              : 'text-fg-muted border-transparent hover:text-fg hover:bg-surface/50',
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Добавить ссылку
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('opml')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer',
            activeTab === 'opml'
              ? 'text-primary border-primary bg-surface shadow-sm'
              : 'text-fg-muted border-transparent hover:text-fg hover:bg-surface/50',
          )}
        >
          <Download className="w-3.5 h-3.5" />
          OPML Экспорт/Импорт
        </button>
      </div>

      {/* Содержимое активной вкладки */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {activeTab === 'my-feeds' && (
          <div className="space-y-4">
            {/* Поиск по лентам */}
            <div className="flex items-center justify-between gap-3">
              <Input
                placeholder="Поиск по названию, URL или папке..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('add')}
                className="shrink-0 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить
              </Button>
            </div>

            {feeds.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Rss className="w-10 h-10 text-fg-muted/40 mx-auto" />
                <p className="text-sm font-medium text-fg">У вас пока нет добавленных RSS-лент</p>
                <p className="text-xs text-fg-muted">
                  Выберите источники из каталога или введите произвольную ссылку
                </p>
                <Button variant="primary" size="sm" onClick={() => setActiveTab('presets')}>
                  Выбрать из каталога
                </Button>
              </div>
            ) : Array.from(foldersMap.entries()).map(([folderName, folderFeeds]) => (
              <div key={folderName} className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted px-1">
                  <Folder className="w-3.5 h-3.5 text-primary" />
                  <span>{folderName}</span>
                  <span className="text-[10px] text-fg-muted/70">({folderFeeds.length})</span>
                </div>

                <div className="space-y-1.5">
                  {folderFeeds.map((feed) => (
                    <div
                      key={feed.id}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-xl border transition-all',
                        feed.enabled
                          ? 'bg-surface border-line shadow-sm'
                          : 'bg-surface/40 border-line/50 opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: feed.color || '#65a30d' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-fg truncate">{feed.name}</p>
                          <p className="text-[10px] text-fg-muted truncate">{feed.url}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={feed.enabled !== false}
                          onChange={() => toggleFeedEnabled(feed.id)}
                          aria-label={`Включить или отключить ${feed.name}`}
                        />
                        <button
                          type="button"
                          aria-label={`Удалить ${feed.name}`}
                          onClick={() => deleteFeed(feed.id)}
                          className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Каталог пресетов */}
        {activeTab === 'presets' && (
          <div className="space-y-5">
            <p className="text-xs text-fg-muted">
              Популярные русскоязычные и мировые новостные каналы. Нажмите кнопку, чтобы добавить в
              свою ленту:
            </p>

            {RSS_PRESET_CATEGORIES.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-fg">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span>{category.name}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {category.feeds.map((preset) => {
                    const isAdded = feeds.some(
                      (f) => f.url.toLowerCase() === preset.url.toLowerCase(),
                    );
                    return (
                      <div
                        key={preset.id}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl border transition-all',
                          isAdded
                            ? 'bg-primary/5 border-primary/40'
                            : 'bg-surface border-line hover:border-line-hover',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 mr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: preset.color }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-fg truncate">{preset.name}</p>
                            <p className="text-[10px] text-fg-muted truncate">{preset.url}</p>
                          </div>
                        </div>

                        {isAdded ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-primary shrink-0 px-2 py-0.5 rounded-md bg-primary/10">
                            <Check className="w-3 h-3" />
                            Добавлено
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => addPresetFeed(preset)}
                            className="shrink-0 h-7 text-[11px] px-2.5 gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Добавить
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Добавить произвольную ссылку */}
        {activeTab === 'add' && (
          <form onSubmit={addCustomFeed} className="space-y-4 max-w-lg mx-auto py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-fg flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-primary" />
                URL адрес RSS / Atom ленты <span className="text-danger">*</span>
              </label>
              <Input
                placeholder="https://example.com/rss.xml"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-fg flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-primary" />
                Название ленты (необязательно)
              </label>
              <Input
                placeholder="Например: Мой любимый блог"
                value={feedName}
                onChange={(e) => setFeedName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-fg flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-primary" />
                Папка / Тема
              </label>
              <Input
                placeholder="Например: IT, Новости, Игры"
                value={feedFolder}
                onChange={(e) => setFeedFolder(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-fg flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-primary" />
                Цветовой маркер
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {FEED_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFeedColor(c)}
                    className={cn(
                      'w-6 h-6 rounded-full transition-transform cursor-pointer border-2',
                      feedColor === c ? 'border-fg scale-110 shadow-sm' : 'border-transparent hover:scale-105',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-xs text-danger font-medium bg-danger/10 p-2 rounded-lg">
                {formError}
              </p>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveTab('my-feeds')}>
                Отмена
              </Button>
              <Button type="submit" variant="primary" size="sm" className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Добавить ленту
              </Button>
            </div>
          </form>
        )}

        {/* Экспорт и импорт OPML */}
        {activeTab === 'opml' && (
          <div className="space-y-6 py-2 max-w-lg mx-auto">
            <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-fg">
                <Download className="w-4 h-4 text-primary" />
                Экспорт подписок (OPML)
              </div>
              <p className="text-xs text-fg-muted">
                Сохраните все ваши настроенные ленты в стандартный файл .opml для резервного копирования
                или переноса в Feedly, Inoreader, NetNewsWire и другие RSS-читалки.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportOpml}
                disabled={feeds.length === 0}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Экспортировать {feeds.length} лент в .opml
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-fg">
                <Upload className="w-4 h-4 text-primary" />
                Импорт подписок (OPML)
              </div>
              <p className="text-xs text-fg-muted">
                Загрузите файл экспорта .opml или .xml из другого RSS-ридера. Новые ленты будут
                автоматически добавлены в ваш список.
              </p>
              <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-surface-hover hover:bg-surface border border-line rounded-lg cursor-pointer transition-colors text-fg">
                <Upload className="w-3.5 h-3.5 text-primary" />
                Выбрать OPML файл
                <input
                  type="file"
                  accept=".opml,.xml"
                  onChange={handleImportOpml}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-line p-3 flex justify-between items-center bg-surface shrink-0">
        <span className="text-[11px] text-fg-muted">
          Активно лент: {feeds.filter((f) => f.enabled !== false).length} из {feeds.length}
        </span>
        <Button variant="primary" size="sm" onClick={onClose}>
          Готово
        </Button>
      </div>
    </Modal>
  );
};
