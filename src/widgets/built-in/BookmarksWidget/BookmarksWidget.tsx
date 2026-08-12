import React, { useState, useEffect } from 'react';
import { Bookmark, Folder, ExternalLink, Search, Plus, Trash2, Edit3, Grid, LayoutList, Table as TableIcon } from 'lucide-react';
import { SingleBookmarkTile } from './SingleBookmarkTile';
import { useChromeBookmarksStore, BookmarkNode } from '@/services/storage/ChromeBookmarksSync';

export interface BookmarksWidgetProps {
  instanceId: string;
  settings?: {
    mode?: 'single' | 'folder' | 'internal';
    selectedFolderId?: string;
    viewMode?: 'tiles' | 'list' | 'table';
    singleTitle?: string;
    singleUrl?: string;
    singleIconUrl?: string;
    showTitle?: boolean;
    showIcon?: boolean;
  };
}

export const BookmarksWidget: React.FC<BookmarksWidgetProps> = ({ instanceId, settings }) => {
  const mode = settings?.mode || 'folder';
  const viewMode = settings?.viewMode || 'tiles';
  const selectedFolderId = settings?.selectedFolderId || '1';

  const { tree, isLoaded, loadTree, createBookmark, deleteBookmark, renameBookmark, createFolder } =
    useChromeBookmarksStore();

  const [currentFolderId, setCurrentFolderId] = useState<string>(selectedFolderId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isFolderType, setIsFolderType] = useState(false);

  useEffect(() => {
    loadTree();
  }, []);

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
    (item.url && item.url.toLowerCase().includes(searchQuery.toLowerCase()))
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
      await createBookmark(currentFolderId, newTitle.trim(), newUrl.trim());
    }

    setNewTitle('');
    setNewUrl('');
    setIsAddingItem(false);
  };

  return (
    <div className="flex flex-col h-full w-full space-y-2">
      {/* Навигация и поиск */}
      <div className="flex items-center justify-between space-x-2 pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center space-x-2 min-w-0">
          {currentFolder && currentFolder.id !== selectedFolderId && (
            <button
              onClick={() => setCurrentFolderId(currentFolder.parentId || selectedFolderId)}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline truncate"
            >
              ← Назад
            </button>
          )}
          <span className="text-xs font-semibold text-[var(--color-text)] truncate">
            {currentFolder ? currentFolder.title : 'Закладки'}
          </span>
        </div>

        {/* Поиск и Добавление */}
        <div className="flex items-center space-x-1.5">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[var(--color-surface)] text-[11px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] border border-[var(--color-border)] rounded-lg pl-7 pr-2 py-1 w-28 focus:w-36 transition-all focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="p-1 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
            title="Добавить закладку или папку"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Форма добавления (2-way sync с Chrome API) */}
      {isAddingItem && (
        <form onSubmit={handleCreate} className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
          <div className="flex items-center space-x-3 text-xs text-[var(--color-text)]">
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={!isFolderType}
                onChange={() => setIsFolderType(false)}
                className="text-[var(--color-primary)]"
              />
              <span>Ссылка</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={isFolderType}
                onChange={() => setIsFolderType(true)}
                className="text-[var(--color-primary)]"
              />
              <span>Папка</span>
            </label>
          </div>

          <input
            type="text"
            placeholder="Название"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
          />

          {!isFolderType && (
            <input
              type="text"
              placeholder="URL (https://...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
          )}

          <div className="flex justify-end space-x-2 pt-1">
            <button type="button" onClick={() => setIsAddingItem(false)} className="text-xs text-[var(--color-text-muted)]">
              Отмена
            </button>
            <button type="submit" className="px-3 py-1 text-xs text-white bg-[var(--color-primary)] rounded-lg font-semibold">
              Создать
            </button>
          </div>
        </form>
      )}

      {/* Вывод списка закладок в заданном viewMode */}
      <div className="flex-1 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-center text-xs text-[var(--color-text-muted)] py-6">
            Нет закладок в этой папке
          </div>
        ) : viewMode === 'tiles' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.children) setCurrentFolderId(item.id);
                  else if (item.url) window.location.href = item.url;
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer text-center group relative overflow-hidden"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBookmark(item.id);
                  }}
                  className="absolute top-1 right-1 p-0.5 rounded bg-rose-500/10 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Удалить"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {item.children ? (
                  <Folder className="w-6 h-6 text-amber-400 mb-1" />
                ) : (
                  <img
                    src={getFaviconUrl(item.url)}
                    alt=""
                    className="w-6 h-6 rounded mb-1 object-contain group-hover:scale-110 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="text-[11px] font-medium text-[var(--color-text)] truncate w-full">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        ) : viewMode === 'table' ? (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="pb-1 font-semibold">Название</th>
                <th className="pb-1 font-semibold text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    if (item.children) setCurrentFolderId(item.id);
                    else if (item.url) window.location.href = item.url;
                  }}
                  className="border-b border-[var(--color-border)]/40 hover:bg-[var(--color-surface-hover)] cursor-pointer group"
                >
                  <td className="py-2 flex items-center space-x-2">
                    {item.children ? (
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <img src={getFaviconUrl(item.url)} alt="" className="w-4 h-4 rounded shrink-0" />
                    )}
                    <span className="truncate font-medium text-[var(--color-text)]">{item.title}</span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBookmark(item.id);
                      }}
                      className="p-1 rounded text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.children) setCurrentFolderId(item.id);
                  else if (item.url) window.location.href = item.url;
                }}
                className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  {item.children ? (
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <img src={getFaviconUrl(item.url)} alt="" className="w-4 h-4 rounded shrink-0" />
                  )}
                  <span className="text-xs font-medium text-[var(--color-text)] truncate">{item.title}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBookmark(item.id);
                  }}
                  className="p-1 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
