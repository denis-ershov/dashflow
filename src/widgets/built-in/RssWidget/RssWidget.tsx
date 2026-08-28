import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Search,
  X,
  List,
  Layers,
  FolderTree,
  Rss,
  Folder,
  ChevronDown,
} from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { Skeleton } from '@/ui/feedback/Skeleton';
import { EmptyState, ErrorState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type {
  RssItem,
  RssSettings,
  RssFeedConfig,
  RssReadingMode,
  RssViewMode,
} from './types';
import { DEFAULT_FEEDS } from './presets';
import { fetchAndParseFeed, formatRssTimeAgo } from './rssParser';
import { getRssCardClasses } from './rssStyles';
import { RssFeedManagerModal } from './RssFeedManagerModal';

export const RssWidget: React.FC<WidgetProps<RssSettings>> = ({
  instanceId,
  settings,
}) => {
  const { updateWidgetSettings } = useDashboardStore();

  // Инициализация лент с поддержкой обратной совместимости
  const initialFeeds: RssFeedConfig[] = useMemo(() => {
    if (settings?.feeds && settings.feeds.length > 0) {
      return settings.feeds;
    }
    if (settings?.feedUrls && settings.feedUrls.length > 0) {
      return settings.feedUrls.map((url, idx) => ({
        id: `feed-legacy-${idx}`,
        name: url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0],
        url,
        enabled: true,
        folder: 'Общие',
      }));
    }
    if (settings?.feedUrl) {
      return [
        {
          id: 'feed-legacy-single',
          name: settings.feedUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0],
          url: settings.feedUrl,
          enabled: true,
          folder: 'Общие',
        },
      ];
    }
    return DEFAULT_FEEDS;
  }, [settings?.feeds, settings?.feedUrls, settings?.feedUrl]);

  const [feeds, setFeeds] = useState<RssFeedConfig[]>(initialFeeds);
  useEffect(() => {
    setFeeds(initialFeeds);
  }, [initialFeeds]);

  // Настройки отображения и режимов
  const [readingMode, setReadingMode] = useState<RssReadingMode>(
    settings?.readingMode || 'unified',
  );
  useEffect(() => {
    if (settings?.readingMode) {
      setReadingMode(settings.readingMode);
    }
  }, [settings?.readingMode]);

  const viewMode: RssViewMode = settings?.viewMode || 'thumbnails';
  const cardStyle = settings?.cardStyle || 'glass';
  const borderRadius = settings?.borderRadius || 'md';
  const itemCount = settings?.itemCount ?? 15;
  const showThumbnails = settings?.showThumbnails !== false;
  const showDescription = settings?.showDescription !== false;
  const showSource = settings?.showSource !== false;
  const showDate = settings?.showDate !== false;
  const openInNewTab = settings?.openInNewTab !== false;
  const showSearch = settings?.showSearch !== false;
  const refreshInterval = settings?.refreshInterval ?? 30;

  // Локальные состояния
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFeedManagerOpen, setIsFeedManagerOpen] = useState(false);

  // Выбранная вкладка ленты или папки
  const [activeFeedId, setActiveFeedId] = useState<string>(
    settings?.activeFeedId || feeds[0]?.id || '',
  );
  const [activeFolder, setActiveFolder] = useState<string>(
    settings?.activeFolder || 'Все темы',
  );

  // Активные (включенные) ленты
  const activeFeeds = useMemo(() => feeds.filter((f) => f.enabled !== false), [feeds]);

  // Список всех уникальных папок
  const allFolders = useMemo(() => {
    const set = new Set<string>();
    activeFeeds.forEach((f) => {
      if (f.folder) set.add(f.folder);
    });
    return Array.from(set);
  }, [activeFeeds]);

  // Стили для карточек новостей
  const { cardClass, badgeClass } = useMemo(
    () => getRssCardClasses({ cardStyle, borderRadius }),
    [cardStyle, borderRadius],
  );

  // Загрузка новостей
  const loadFeeds = useCallback(async () => {
    if (activeFeeds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);

      // Загружаем параллельно все активные фиды
      const promises = activeFeeds.map((feed) =>
        fetchAndParseFeed(feed, itemCount).catch((err) => {
          console.warn(`[RssWidget] Failed to fetch feed ${feed.name}:`, err);
          return [] as RssItem[];
        }),
      );

      const results = await Promise.all(promises);
      const combined = results.flat();

      // Сортировка по времени публикации (новые сверху)
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setItems(combined);
    } catch {
      setError('Не удалось загрузить RSS-ленты. Проверьте подключение к сети.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeFeeds, itemCount]);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  // Автообновление по интервалу
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    const intervalMs = refreshInterval * 60 * 1000;
    const timer = setInterval(() => {
      loadFeeds();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [refreshInterval, loadFeeds]);

  // Сохранение отредактированных лент
  const handleSaveFeeds = (newFeeds: RssFeedConfig[]) => {
    setFeeds(newFeeds);
    if (instanceId) {
      updateWidgetSettings(instanceId, {
        ...settings,
        feeds: newFeeds,
      });
    }
  };

  // Переключение режима чтения
  const handleReadingModeChange = (mode: RssReadingMode) => {
    setReadingMode(mode);
    if (instanceId) {
      updateWidgetSettings(instanceId, {
        ...settings,
        readingMode: mode,
      });
    }
  };

  // Фильтрация новостей в зависимости от режима и поиска
  const filteredItems = useMemo(() => {
    let list = items;

    // 1. Фильтрация по режиму
    if (readingMode === 'feed-tabs' && activeFeedId) {
      list = list.filter((item) => item.feedId === activeFeedId);
    } else if (readingMode === 'folders' && activeFolder && activeFolder !== 'Все темы') {
      list = list.filter((item) => item.folder === activeFolder);
    }

    // 2. Поиск по ключевым словам
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.feedName && item.feedName.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [items, readingMode, activeFeedId, activeFolder, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full p-2.5 select-none overflow-hidden min-h-0">
      {/* 1. Верхняя панель управления виджетом */}
      <div className="flex flex-col gap-2 pb-2 mb-2 border-b border-line/60 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Режимы чтения: Единая / По источникам / По папкам */}
          <div className="flex items-center p-0.5 bg-surface-hover/60 rounded-lg border border-line/40 shrink-0">
            <button
              type="button"
              onClick={() => handleReadingModeChange('unified')}
              className={cn(
                'p-1.5 rounded-md text-xs transition-colors cursor-pointer',
                readingMode === 'unified'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-fg-muted hover:text-fg',
              )}
              title="Единый хронологический поток"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleReadingModeChange('feed-tabs')}
              className={cn(
                'p-1.5 rounded-md text-xs transition-colors cursor-pointer',
                readingMode === 'feed-tabs'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-fg-muted hover:text-fg',
              )}
              title="Чтение по отдельным источникам"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleReadingModeChange('folders')}
              className={cn(
                'p-1.5 rounded-md text-xs transition-colors cursor-pointer',
                readingMode === 'folders'
                  ? 'bg-surface text-primary shadow-xs font-semibold'
                  : 'text-fg-muted hover:text-fg',
              )}
              title="Группировка по темам и папкам"
            >
              <FolderTree className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Строка поиска (если включена) */}
          {showSearch && (
            <div className="relative flex-1 max-w-[200px] min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск новостей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-xs rounded-lg bg-surface border border-line text-fg placeholder:text-fg-muted/60 focus:outline-none focus:border-primary/70 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-fg-muted hover:text-fg rounded-md"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Кнопки действий: Обновить и Управление лентами */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Обновить ленты"
              onClick={loadFeeds}
              disabled={isRefreshing}
              className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Обновить новости"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-primary')} />
            </button>

            <button
              type="button"
              aria-label="Управление лентами"
              onClick={() => setIsFeedManagerOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-fg-muted hover:text-fg hover:bg-surface-hover border border-line/60 rounded-lg transition-colors cursor-pointer"
              title="Настроить ленты и папки"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Ленты</span>
            </button>
          </div>
        </div>

        {/* 2. Подпанель фильтрации: Вкладки лент или папок */}
        {readingMode === 'feed-tabs' && activeFeeds.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
            {activeFeeds.map((feed) => (
              <button
                key={feed.id}
                type="button"
                onClick={() => setActiveFeedId(feed.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg shrink-0 transition-all border cursor-pointer',
                  activeFeedId === feed.id
                    ? 'bg-surface text-primary border-primary/50 shadow-xs font-bold'
                    : 'bg-surface/50 text-fg-muted border-line/40 hover:bg-surface hover:text-fg',
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: feed.color || '#65a30d' }}
                />
                <span className="truncate max-w-[120px]">{feed.name}</span>
              </button>
            ))}
          </div>
        )}

        {readingMode === 'folders' && allFolders.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFolder('Все темы')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg shrink-0 transition-all border cursor-pointer',
                activeFolder === 'Все темы'
                  ? 'bg-surface text-primary border-primary/50 shadow-xs font-bold'
                  : 'bg-surface/50 text-fg-muted border-line/40 hover:bg-surface hover:text-fg',
              )}
            >
              <Rss className="w-3 h-3 text-primary" />
              <span>Все темы</span>
            </button>

            {allFolders.map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => setActiveFolder(folder)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg shrink-0 transition-all border cursor-pointer',
                  activeFolder === folder
                    ? 'bg-surface text-primary border-primary/50 shadow-xs font-bold'
                    : 'bg-surface/50 text-fg-muted border-line/40 hover:bg-surface hover:text-fg',
                )}
              >
                <Folder className="w-3 h-3 text-primary" />
                <span className="truncate max-w-[120px]">{folder}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Содержимое: Список новостей или состояния */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-0.5 space-y-2">
        {loading && items.length === 0 ? (
          <div className="space-y-2 p-1">
            <Skeleton className="w-full h-16 rounded-xl" />
            <Skeleton className="w-full h-16 rounded-xl" />
            <Skeleton className="w-full h-16 rounded-xl" />
            <Skeleton className="w-full h-16 rounded-xl" />
          </div>
        ) : error && items.length === 0 ? (
          <div className="p-4 h-full flex flex-col items-center justify-center">
            <ErrorState title="Ошибка загрузки RSS" message={error} onRetry={loadFeeds} />
          </div>
        ) : activeFeeds.length === 0 ? (
          <div className="p-4 h-full flex flex-col items-center justify-center">
            <EmptyState
              title="Нет активных лент"
              description="Включите одну или несколько RSS-лент в менеджере подписок"
            />
            <button
              type="button"
              onClick={() => setIsFeedManagerOpen(true)}
              className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-fg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Настроить ленты
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 h-full flex flex-col items-center justify-center">
            <EmptyState
              title={searchQuery ? 'Ничего не найдено' : 'Нет публикаций'}
              description={
                searchQuery
                  ? `По запросу «${searchQuery}» публикации не найдены`
                  : 'В выбранных источниках пока нет доступных новостей'
              }
            />
          </div>
        ) : (
          /* Рендеринг различных макетов */
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-2'
                : 'flex flex-col gap-2',
            )}
          >
            {filteredItems.map((item, idx) => {
              const isMagazineHero = viewMode === 'magazine' && idx === 0;

              return (
                <a
                  key={item.id || `${item.link}-${idx}`}
                  href={item.link}
                  target={openInNewTab ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className={cn(
                    cardClass,
                    isMagazineHero && 'col-span-full bg-surface-hover/80 border-primary/40',
                  )}
                >
                  {/* Макет: Крупные карточки (cards) или Hero Журнала */}
                  {(viewMode === 'cards' || isMagazineHero) && showThumbnails && item.thumbnail && (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden mb-2.5 bg-surface-hover border border-line/40">
                      <img
                        src={item.thumbnail}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Макет: С миниатюрами (thumbnails) - горизонтальный ряд */}
                  {viewMode === 'thumbnails' && !isMagazineHero && showThumbnails && item.thumbnail && (
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-hover border border-line/40">
                        <img
                          src={item.thumbnail}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-xs font-semibold text-fg group-hover/item:text-primary line-clamp-2 transition-colors duration-200">
                              {item.title}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-fg-muted opacity-0 group-hover/item:opacity-100 shrink-0 transition-opacity" />
                          </div>
                          {showDescription && item.description && (
                            <p className="text-[11px] text-fg-muted line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-fg-muted">
                          {showSource && (
                            <span className={badgeClass}>
                              {item.feedColor && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: item.feedColor }}
                                />
                              )}
                              <span className="truncate">{item.feedName}</span>
                            </span>
                          )}
                          {showDate && (
                            <span className="font-mono ml-auto">
                              {formatRssTimeAgo(item.timestamp, item.pubDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Макет: Компактный список (compact) */}
                  {viewMode === 'compact' && (
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {item.feedColor ? (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: item.feedColor }}
                          />
                        ) : (
                          <Rss className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-fg group-hover/item:text-primary truncate transition-colors duration-200">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-fg-muted">
                        {showSource && (
                          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-surface-hover/80 border border-line/40 font-medium truncate max-w-[100px]">
                            {item.feedName}
                          </span>
                        )}
                        {showDate && (
                          <span className="font-mono">
                            {formatRssTimeAgo(item.timestamp, item.pubDate)}
                          </span>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-fg-muted opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}

                  {/* Макеты: Cards, Grid, или Magazine без картинок */}
                  {((viewMode === 'cards' || isMagazineHero || viewMode === 'grid') ||
                    (viewMode === 'thumbnails' && (!showThumbnails || !item.thumbnail))) && (
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-fg group-hover/item:text-primary line-clamp-2 transition-colors duration-200">
                          {item.title}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-fg-muted opacity-0 group-hover/item:opacity-100 shrink-0 transition-opacity mt-0.5" />
                      </div>

                      {showDescription && item.description && (
                        <p className="text-[11px] text-fg-muted line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-line/40 text-[10px] text-fg-muted">
                        {showSource && (
                          <span className={badgeClass}>
                            {item.feedColor && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.feedColor }}
                              />
                            )}
                            <span className="truncate">{item.feedName}</span>
                          </span>
                        )}
                        {showDate && (
                          <span className="font-mono ml-auto">
                            {formatRssTimeAgo(item.timestamp, item.pubDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Модальное окно управления лентами */}
      <RssFeedManagerModal
        isOpen={isFeedManagerOpen}
        onClose={() => setIsFeedManagerOpen(false)}
        feeds={feeds}
        onSaveFeeds={handleSaveFeeds}
      />
    </div>
  );
};
