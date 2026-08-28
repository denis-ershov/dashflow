import React, { useState, useEffect } from 'react';
import { Folder, Search, Plus, Trash2, History, Bookmark as BookmarkIcon, RotateCcw } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { SingleBookmarkTile } from './SingleBookmarkTile';
import { useChromeBookmarksStore, BookmarkNode } from '@/services/storage/ChromeBookmarksSync';
import { Button, Badge } from '@/ui/primitives';
import { EmptyState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { BookmarkSettings, RecentlyClosedItem } from './types';

export const BookmarksWidget: React.FC<WidgetProps<BookmarkSettings>> = ({ instanceId, settings }) => {
  const mode = settings?.mode || 'folder';
  const viewMode = settings?.viewMode || 'tiles';
  const selectedFolderId = settings?.selectedFolderId || '1';

  const [activeTab, setActiveTab] = useState<'bookmarks' | 'recent'>(settings?.activeTab || 'bookmarks');
  const [recentlyClosed, setRecentlyClosed] = useState<RecentlyClosedItem[]>([]);

  const { tree, loadTree, createBookmark, deleteBookmark, createFolder } =
    useChromeBookmarksStore();

  const [currentFolderId, setCurrentFolderId] = useState<string>(selectedFolderId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isFolderType, setIsFolderType] = useState(false);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    setCurrentFolderId(selectedFolderId);
  }, [selectedFolderId]);

  // Загрузка недавно закрытых вкладок
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.sessions?.getRecentlyClosed) {
      chrome.sessions.getRecentlyClosed({ maxResults: 15 }, (sessions) => {
        if (!sessions) return;
        const items: RecentlyClosedItem[] = [];
        sessions.forEach((s, idx) => {
          if (s.tab) {
            items.push({
              id: s.tab.sessionId || String(idx),
              title: s.tab.title || s.tab.url || 'Вкладка',
              url: s.tab.url || '',
              sessionId: s.tab.sessionId,
              lastModified: s.lastModified,
            });
          } else if (s.window && s.window.tabs) {
            s.window.tabs.forEach((tab, tIdx) => {
              items.push({
                id: tab.sessionId || `${idx}-${tIdx}`,
                title: tab.title || tab.url || 'Вкладка',
                url: tab.url || '',
                sessionId: tab.sessionId,
                lastModified: s.lastModified,
              });
            });
          }
        });
        setRecentlyClosed(items);
      });
    }
  }, [activeTab]);

  if (mode === 'single') {
    return (
      <SingleBookmarkTile
        instanceId={instanceId}
        settings={{
          singleTitle: settings?.singleTitle,
          singleUrl: settings?.singleUrl,
          singleIconUrl: settings?.singleIconUrl,
          showTitle: settings?.showTitle,
          showIcon: settings?.showIcon,
        }}
      />
    );
  }

  // Поиск выбранной папки в дереве
  const findFolderInTree = (nodes: BookmarkNode[], folderId: string): BookmarkNode | null => {
    for (const node of nodes) {
      if (node.id === folderId) return node;
      if (node.children) {
        const found = findFolderInTree(node.children, folderId);
        if (found) return found;
      }
    }
    return null;
  };

  const currentFolder = findFolderInTree(tree, currentFolderId) || (tree[0] ? tree[0] : null);
  const rawItems = currentFolder?.children || [];

  // Фильтрация поиска закладок
  const items = rawItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.url && item.url.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Фильтрация поиска недавних вкладок
  const filteredRecent = recentlyClosed.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.url.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getFaviconUrl = (url?: string) => {
    if (!url) return '';
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      return '';
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (isFolderType) {
      await createFolder(currentFolderId, newTitle.trim());
    } else if (newUrl.trim()) {
      let formattedUrl = newUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }
      await createBookmark(currentFolderId, newTitle.trim(), formattedUrl);
    }

    setNewTitle('');
    setNewUrl('');
    setIsAddingItem(false);
  };

  const restoreTab = (item: RecentlyClosedItem) => {
    if (item.sessionId && typeof chrome !== 'undefined' && chrome.sessions?.restore) {
      chrome.sessions.restore(item.sessionId);
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-2 p-2 select-none">
      {/* Главные вкладки: Закладки / Недавно закрытые */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
        <div className="flex items-center gap-1 bg-surface/50 p-1 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'bookmarks'
                ? 'bg-primary text-primary-fg shadow-1'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <BookmarkIcon className="w-4 h-4" />
            <span>Закладки</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'recent'
                ? 'bg-primary text-primary-fg shadow-1'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <History className="w-4 h-4" />
            <span>Недавние</span>
            {recentlyClosed.length > 0 && (
              <Badge variant="glass" className="ml-1 text-[10px]">
                {recentlyClosed.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Поиск и кнопка создания (только в закладках) */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-fg-muted absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded-lg pl-7 pr-2 py-1 w-20 sm:w-28 focus:w-36 transition-all focus-visible:outline-none focus-visible:border-primary"
            />
          </div>

          {activeTab === 'bookmarks' && (
            <Button
              size="sm"
              variant="primary"
              aria-label="Добавить закладку"
              onClick={() => setIsAddingItem(!isAddingItem)}
              icon={<Plus className="w-4 h-4" />}
            />
          )}
        </div>
      </div>

      {/* Навигация по папкам (в режиме закладок) */}
      {activeTab === 'bookmarks' && currentFolder && currentFolder.id !== selectedFolderId && (
        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => setCurrentFolderId(currentFolder.parentId || selectedFolderId)}
            className="text-xs font-semibold text-primary hover:underline truncate cursor-pointer"
          >
            ← Назад: {currentFolder.title}
          </button>
        </div>
      )}

      {/* Форма добавления закладки */}
      {activeTab === 'bookmarks' && isAddingItem && (
        <form onSubmit={handleCreate} className="p-3 rounded-xl bg-surface border border-line space-y-2">
          <div className="flex items-center gap-3 text-xs text-fg">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={!isFolderType}
                onChange={() => setIsFolderType(false)}
                className="text-primary"
              />
              <span>Ссылка</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={isFolderType}
                onChange={() => setIsFolderType(true)}
                className="text-primary"
              />
              <span>Папка</span>
            </label>
          </div>

          <input
            type="text"
            placeholder="Название"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-surface text-xs text-fg border border-line rounded-lg px-3 py-1 focus-visible:outline-none focus-visible:border-primary"
          />

          {!isFolderType && (
            <input
              type="text"
              placeholder="URL (https://...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full bg-surface text-xs text-fg border border-line rounded-lg px-3 py-1 focus-visible:outline-none focus-visible:border-primary"
            />
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" type="button" onClick={() => setIsAddingItem(false)}>
              Отмена
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Создать
            </Button>
          </div>
        </form>
      )}

      {/* Контент активной вкладки */}
      {activeTab === 'bookmarks' ? (
        /* Список закладок */
        <div className="flex-1 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <EmptyState
              title="Нет закладок"
              description={searchQuery ? 'Ничего не найдено' : 'В этой папке пока нет элементов'}
            />
          ) : viewMode === 'tiles' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.children) {
                      setCurrentFolderId(item.id);
                    } else if (item.url) {
                      window.location.href = item.url;
                    }
                  }}
                  className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-surface hover:bg-surface-hover border border-line hover:border-line-hover transition-all cursor-pointer select-none text-center"
                >
                  {item.children ? (
                    <Folder className="w-6 h-6 text-warning mb-1" />
                  ) : (
                    <img
                      src={getFaviconUrl(item.url)}
                      alt=""
                      className="w-5 h-5 mb-1 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-[11px] font-medium text-fg truncate w-full group-hover:text-primary">
                    {item.title}
                  </span>

                  <button
                    type="button"
                    aria-label="Удалить элемент"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBookmark(item.id);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-fg-muted hover:text-danger rounded hover:bg-danger/10 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.children) {
                      setCurrentFolderId(item.id);
                    } else if (item.url) {
                      window.location.href = item.url;
                    }
                  }}
                  className="group flex items-center justify-between p-2 rounded-xl bg-surface hover:bg-surface-hover border border-line hover:border-line-hover transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.children ? (
                      <Folder className="w-4 h-4 text-warning shrink-0" />
                    ) : (
                      <img
                        src={getFaviconUrl(item.url)}
                        alt=""
                        className="w-4 h-4 shrink-0 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="text-xs font-medium text-fg truncate group-hover:text-primary">
                      {item.title}
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label="Удалить закладку"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBookmark(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-fg-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Недавно закрытые вкладки */
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredRecent.length === 0 ? (
            <EmptyState
              title="Нет недавних вкладок"
              description="Здесь появятся недавно закрытые страницы Chrome"
            />
          ) : (
            <div className="flex flex-col gap-1">
              {filteredRecent.map((item) => (
                <div
                  key={item.id}
                  onClick={() => restoreTab(item)}
                  className="group flex items-center justify-between p-2 rounded-xl bg-surface hover:bg-surface-hover border border-line hover:border-primary transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={getFaviconUrl(item.url)}
                      alt=""
                      className="w-4 h-4 shrink-0 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-fg truncate block group-hover:text-primary">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-fg-muted truncate block">
                        {item.url}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Восстановить вкладку"
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreTab(item);
                    }}
                    className="p-1 text-fg-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-all cursor-pointer shrink-0"
                    title="Восстановить вкладку"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
