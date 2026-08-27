import React, { useState, useEffect } from 'react';
import { Folder, Search, Plus, Trash2 } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { SingleBookmarkTile } from './SingleBookmarkTile';
import { useChromeBookmarksStore, BookmarkNode } from '@/services/storage/ChromeBookmarksSync';
import { Button } from '@/ui/primitives';
import { EmptyState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { BookmarkSettings } from './types';

export const BookmarksWidget: React.FC<WidgetProps<BookmarkSettings>> = ({ instanceId, settings }) => {
  const mode = settings?.mode || 'folder';
  const viewMode = settings?.viewMode || 'tiles';
  const selectedFolderId = settings?.selectedFolderId || '1';

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

  // Фильтрация поиска
  const items = rawItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.url && item.url.toLowerCase().includes(searchQuery.toLowerCase())),
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

  return (
    <div className="flex flex-col h-full w-full gap-2 p-2 select-none">
      {/* Навигация и поиск */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-line/40">
        <div className="flex items-center gap-2 min-w-0">
          {currentFolder && currentFolder.id !== selectedFolderId && (
            <button
              type="button"
              onClick={() => setCurrentFolderId(currentFolder.parentId || selectedFolderId)}
              className="text-xs font-semibold text-primary hover:underline truncate"
            >
              ← Назад
            </button>
          )}
          <span className="text-xs font-semibold text-fg truncate">
            {currentFolder ? currentFolder.title : 'Закладки'}
          </span>
        </div>

        {/* Поиск и Добавление */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-fg-muted absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded pl-7 pr-2 py-1 w-24 sm:w-32 focus:w-40 transition-all focus-visible:outline-none focus-visible:border-primary"
            />
          </div>

          <Button
            size="sm"
            variant="primary"
            aria-label="Добавить закладку"
            onClick={() => setIsAddingItem(!isAddingItem)}
            icon={<Plus className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Форма добавления */}
      {isAddingItem && (
        <form onSubmit={handleCreate} className="p-3 rounded-lg bg-surface border border-line space-y-2">
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
            className="w-full bg-surface text-xs text-fg border border-line rounded px-2.5 py-1.5 focus-visible:outline-none focus-visible:border-primary"
          />

          {!isFolderType && (
            <input
              type="text"
              placeholder="URL (https://...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full bg-surface text-xs text-fg border border-line rounded px-2.5 py-1.5 focus-visible:outline-none focus-visible:border-primary"
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

      {/* Вывод списка закладок в заданном viewMode (Mobile First: без HTML table на узких экранах) */}
      <div className="flex-1 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <EmptyState
            title="Нет закладок"
            description="В этой папке нет закладок. Добавьте первую выше!"
          />
        ) : viewMode === 'tiles' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (item.children) setCurrentFolderId(item.id);
                    else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                onClick={() => {
                  if (item.children) setCurrentFolderId(item.id);
                  else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                }}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface/70 border border-line/60 hover:border-primary hover:bg-surface-hover transition-all cursor-pointer text-center group relative min-h-[58px]"
              >
                <button
                  type="button"
                  aria-label={`Удалить закладку ${item.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBookmark(item.id);
                  }}
                  className="absolute top-1 right-1 p-0.5 rounded text-fg-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {item.children ? (
                  <Folder className="w-6 h-6 text-warning mb-1" />
                ) : (
                  <img
                    src={getFaviconUrl(item.url)}
                    alt=""
                    aria-hidden="true"
                    className="w-6 h-6 rounded mb-1 object-contain group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="text-[11px] font-medium text-fg truncate w-full px-1">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (item.children) setCurrentFolderId(item.id);
                    else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                onClick={() => {
                  if (item.children) setCurrentFolderId(item.id);
                  else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center justify-between p-2 rounded-lg bg-surface/70 border border-line/60 hover:border-primary hover:bg-surface-hover transition-all cursor-pointer group min-h-[40px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.children ? (
                    <Folder className="w-4 h-4 text-warning shrink-0" />
                  ) : (
                    <img
                      src={getFaviconUrl(item.url)}
                      alt=""
                      aria-hidden="true"
                      className="w-4 h-4 rounded shrink-0"
                    />
                  )}
                  <span className="text-xs font-medium text-fg truncate">{item.title}</span>
                </div>

                <button
                  type="button"
                  aria-label={`Удалить закладку ${item.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBookmark(item.id);
                  }}
                  className="p-1 text-fg-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
