import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw,
  SlidersHorizontal,
  Search,
  X,
  List,
  Layers,
  FolderTree,
  Rss,
  Folder,
  ShieldCheck,
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


import { ALL_FOLDERS, DEFAULT_FOLDER, isAllFolders } from './presets';
import { useTranslation } from '@/core/i18n';
import { originPatternsFor, useBrowserPermissions } from '@/core/permissions/browserPermissions';
import { getRssCardClasses } from './rssStyles';
import { RssFeedManagerModal } from './RssFeedManagerModal';


import { activeFeedSettings, articleLimit, readFeedSettings } from '@/core/feeds/subscriptions';
import { RssArticleDialog } from './RssArticleDialog';
import { RssArticleList } from './RssArticleList';
import { useReadArticles, useRssArticles } from './useRssArticles';

export const RssWidget: React.FC<WidgetProps<RssSettings>> = ({
  instanceId,
  settings,
}) => {
  const updateWidgetSettings = useDashboardStore((s) => s.updateWidgetSettings);
  const { t, tp, formatNumber } = useTranslation();
  const folderLabel = (folder: string) =>
    folder === DEFAULT_FOLDER ? t('rss.defaultFolder') : folder;

  // Инициализация лент с поддержкой обратной совместимости
  const initialFeeds = useMemo(
    () => readFeedSettings(settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only feed settings affect subscriptions
    [settings?.feeds, settings?.feedUrls, settings?.feedUrl],
  );

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
  const itemCount = articleLimit(settings?.itemCount);
  const showThumbnails = settings?.showThumbnails !== false;
  const showDescription = settings?.showDescription !== false;
  const showSource = settings?.showSource !== false;
  const showDate = settings?.showDate !== false;
  const openInNewTab = settings?.openInNewTab !== false;
  const showSearch = settings?.showSearch !== false;
  const refreshInterval = settings?.refreshInterval ?? 30;

  // Локальные состояния
  const [searchQuery, setSearchQuery] = useState('');
  const [isFeedManagerOpen, setIsFeedManagerOpen] = useState(false);

  // Выбранная вкладка ленты или папки
  const [preferredFeedId, setActiveFeedId] = useState<string>(
    settings?.activeFeedId || feeds[0]?.id || '',
  );
  const [activeFolder, setActiveFolder] = useState<string>(
    settings?.activeFolder && !isAllFolders(settings.activeFolder)
      ? settings.activeFolder
      : ALL_FOLDERS,
  );

  // Активные (включенные) ленты
  const activeFeeds = useMemo(() => activeFeedSettings(feeds), [feeds]);
  const activeFeedId = activeFeeds.some(({ id }) => id === preferredFeedId) ? preferredFeedId : activeFeeds[0]?.id;

  // Доступ выдаётся только к сайтам включённых лент (optional_host_permissions)
  const feedOrigins = useMemo(() => originPatternsFor(activeFeeds.map((f) => f.url)), [activeFeeds]);
  const { granted: hasFeedAccess, request: requestFeedAccess } = useBrowserPermissions({
    origins: feedOrigins,
  });

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
  const { items, loading, refreshing: isRefreshing, failures, refresh: refreshFeeds } =
    useRssArticles(instanceId, activeFeeds, itemCount, hasFeedAccess, refreshInterval);
  const { readIds, markRead } = useReadArticles();
  const [openArticle, setOpenArticle] = useState<RssItem>();
  const [readError, setReadError] = useState(false);
  const closeReader = useCallback(() => setOpenArticle(undefined), []);
  const openReader = useCallback((item: RssItem) => {
    setReadError(false);
    setOpenArticle(item);
    void markRead(item.id).catch(() => setReadError(true));
  }, [markRead]);
  const unread = new Set(items.filter((item) => !readIds.has(item.id)).map((item) => item.id)).size;

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
    } else if (readingMode === 'folders' && !isAllFolders(activeFolder)) {
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
              title={t('rss.unifiedHint')}
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
              title={t('rss.tabsHint')}
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
              title={t('rss.foldersHint')}
            >
              <FolderTree className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Строка поиска (если включена) */}
          {showSearch && (
            <div className="relative flex-1 max-w-50 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-muted pointer-events-none" />
              <input
                type="text"
                placeholder={t('rss.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-xs rounded-lg bg-surface border border-line placeholder:text-fg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
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
              aria-label={t('rss.refresh')}
              onClick={refreshFeeds}
              disabled={isRefreshing}
              className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title={t('rss.refreshHint')}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-primary')} />
            </button>

            <button
              type="button"
              aria-label={t('rss.manage')}
              onClick={() => setIsFeedManagerOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-fg-muted hover:text-fg hover:bg-surface-hover border border-line/60 rounded-lg transition-colors cursor-pointer"
              title={t('rss.manageHint')}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{t('rss.feeds')}</span>
            </button>
          </div>
        </div>

        {/* 2. Подпанель фильтрации: Вкладки лент или папок */}
        {hasFeedAccess === true && items.length > 0 && (
          <p className="text-xs font-medium text-fg-muted" aria-live="polite">
            {tp('rss.unreadCount', unread, { count: formatNumber(unread) })}
          </p>
        )}
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
                <span className="truncate max-w-30">{feed.name}</span>
              </button>
            ))}
          </div>
        )}

        {readingMode === 'folders' && allFolders.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFolder(ALL_FOLDERS)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg shrink-0 transition-all border cursor-pointer',
                isAllFolders(activeFolder)
                  ? 'bg-surface text-primary border-primary/50 shadow-xs font-bold'
                  : 'bg-surface/50 text-fg-muted border-line/40 hover:bg-surface hover:text-fg',
              )}
            >
              <Rss className="w-3 h-3 text-primary" />
              <span>{t('rss.allTopics')}</span>
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
                <span className="truncate max-w-30">{folderLabel(folder)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Содержимое: Список новостей или состояния */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {hasFeedAccess === false && activeFeeds.length > 0 ? (
          <div className="p-1 min-h-full flex">
            <EmptyState
              className="p-4 m-auto"
              icon={<ShieldCheck className="w-6 h-6" />}
              title={t('rss.permissionTitle')}
              description={tp('rss.permissionDesc', feedOrigins.length)}
              action={{
                label: t('rss.permissionGrant'),
                onClick: () => void requestFeedAccess(),
              }}
            />
          </div>
        ) : loading && items.length === 0 ? (
          <div className="space-y-2 p-1">
            <Skeleton className="w-full h-16 rounded-xl" />
            <Skeleton className="w-full h-16 rounded-xl" />
            <Skeleton className="w-full h-16 rounded-xl" />
            <Skeleton className="w-full h-16 rounded-xl" />
          </div>
        ) : failures === activeFeeds.length && activeFeeds.length > 0 && items.length === 0 ? (
          <div className="p-4 h-full flex flex-col items-center justify-center">
            <ErrorState title={t('rss.errorTitle')} message={t('rss.loadError')} onRetry={refreshFeeds} />
          </div>
        ) : activeFeeds.length === 0 ? (
          <div className="p-4 h-full flex flex-col items-center justify-center">
            <EmptyState
              title={t('rss.noActiveTitle')}
              description={t('rss.noActiveHint')}
            />
            <button
              type="button"
              onClick={() => setIsFeedManagerOpen(true)}
              className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-fg hover:opacity-90 transition-opacity cursor-pointer"
            >
              {t('rss.configure')}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 h-full flex flex-col items-center justify-center">
            <EmptyState
              title={searchQuery ? t('rss.nothingFound') : t('rss.noPosts')}
              description={
                searchQuery ? t('rss.noResults', { query: searchQuery }) : t('rss.emptySources')
              }
            />
          </div>
        ) : (
          <RssArticleList
            key={JSON.stringify([readingMode, activeFeedId, activeFolder, searchQuery, viewMode])}
            items={filteredItems}
            readIds={readIds}
            onOpen={openReader}
            viewMode={viewMode}
            cardClass={cardClass}
            badgeClass={badgeClass}
            showThumbnails={showThumbnails}
            showDescription={showDescription}
            showSource={showSource}
            showDate={showDate}
          />
        )}
      </div>

      {/* 4. Модальное окно управления лентами */}
      {openArticle && hasFeedAccess === true && <RssArticleDialog
        key={openArticle.id}
        item={openArticle}
        openInNewTab={openInNewTab}
        readError={readError}
        onClose={closeReader}
      />}
      <RssFeedManagerModal
        isOpen={isFeedManagerOpen}
        onClose={() => setIsFeedManagerOpen(false)}
        feeds={feeds}
        onSaveFeeds={handleSaveFeeds}
      />
    </div>
  );
};
