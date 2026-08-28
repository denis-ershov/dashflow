import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  Search,
  Plus,
  Trash2,
  Bookmark as BookmarkIcon,
  RotateCcw,
  Layers,
  Save,
  ChevronDown,
  FolderTree,
  ListFilter,
  SlidersHorizontal,
  Check,
  LayoutGrid,
  Square,
  List,
  Circle,
  Columns2,
  ArrowLeft,
  X,
  ExternalLink,
} from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { SingleBookmarkTile } from './SingleBookmarkTile';
import {
  useChromeBookmarksStore,
  BookmarkNode,
  extractBookmarkFolders,
  flattenBookmarkNodes,
} from '@/services/storage/ChromeBookmarksSync';
import { Button, Badge } from '@/ui/primitives';
import { EmptyState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type {
  BookmarkSettings,
  RecentlyClosedItem,
  OpenChromeTab,
  CustomBookmarkLink,
  BookmarkTileShape,
} from './types';
import {
  getBookmarkTileClasses,
  getBookmarkGridClass,
  getBookmarkFallbackGradient,
} from './bookmarkStyles';

/**
 * Вспомогательный компонент фавикона с красивым градиентным фолбэком
 */
const BookmarkFavicon: React.FC<{
  title?: string;
  url?: string;
  isFolder?: boolean;
  favIconUrl?: string;
  imgClass?: string;
}> = ({ title, url, isFolder, favIconUrl, imgClass }) => {
  const [imgError, setImgError] = useState(false);

  if (isFolder) {
    return <Folder className="w-5 h-5 text-warning fill-warning/20 shrink-0" />;
  }

  const getFaviconUrl = (targetUrl?: string) => {
    if (favIconUrl) return favIconUrl;
    if (!targetUrl) return '';
    try {
      const hostname = new URL(targetUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch {
      return '';
    }
  };

  const finalFavicon = getFaviconUrl(url);
  const letter = (title || url?.replace(/^https?:\/\/(www\.)?/, '') || 'W')
    .charAt(0)
    .toUpperCase();
  const gradientClass = getBookmarkFallbackGradient(title || url || 'W');

  if (!finalFavicon || imgError) {
    return (
      <div
        className={cn(
          'w-full h-full bg-gradient-to-br flex items-center justify-center font-bold text-xs shadow-inner select-none',
          gradientClass,
        )}
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      src={finalFavicon}
      alt=""
      className={cn('object-contain shrink-0', imgClass)}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
};

export const BookmarksWidget: React.FC<WidgetProps<BookmarkSettings>> = ({
  instanceId,
  settings,
  onUpdateSettings,
}) => {
  const mode = settings?.mode || 'folder';
  const initialFolderId = settings?.selectedFolderId || 'all';
  const folderSource = settings?.folderSource || 'chrome';
  const showSearch = settings?.showSearch !== false;

  // Визуальные настройки
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>(settings?.viewMode || 'tiles');
  const [tileShape, setTileShape] = useState<BookmarkTileShape>(
    settings?.tileShape || 'rectangle-horizontal',
  );
  const tileSize = settings?.tileSize || 'medium';
  const cardStyle = settings?.cardStyle || 'glass';
  const borderRadius = settings?.borderRadius || 'md';
  const hoverEffect = settings?.hoverEffect || 'scale';
  const iconSize = settings?.iconSize || 'medium';
  const columns = settings?.columns || 'auto';
  const showTitle = settings?.showTitle !== false;
  const showUrl = settings?.showUrl !== false;
  const showIcon = settings?.showIcon !== false;
  const openInNewTab = settings?.openInNewTab !== false;

  const [structureMode, setStructureMode] = useState<'tree' | 'flatten'>(
    settings?.structureMode || 'tree',
  );

  const [activeSubTab, setActiveSubTab] = useState<'bookmarks' | 'openTabs' | 'recent'>(
    settings?.activeTab || 'bookmarks',
  );

  const [recentlyClosed, setRecentlyClosed] = useState<RecentlyClosedItem[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenChromeTab[]>([]);
  const [customLinks, setCustomLinks] = useState<CustomBookmarkLink[]>(settings?.customLinks || []);

  const { tree, loadTree, createBookmark, deleteBookmark, createFolder } =
    useChromeBookmarksStore();

  const [currentFolderId, setCurrentFolderId] = useState<string>(initialFolderId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isFolderType, setIsFolderType] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);

  const folderMenuRef = useRef<HTMLDivElement>(null);
  const styleMenuRef = useRef<HTMLDivElement>(null);

  // Закрытие выпадающих меню при клике снаружи
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setIsFolderMenuOpen(false);
      }
      if (styleMenuRef.current && !styleMenuRef.current.contains(e.target as Node)) {
        setIsStyleMenuOpen(false);
      }
    };
    if (isFolderMenuOpen || isStyleMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isFolderMenuOpen, isStyleMenuOpen]);

  useEffect(() => {
    if (folderSource === 'chrome') {
      loadTree();
    }
  }, [folderSource, loadTree]);

  useEffect(() => {
    setCurrentFolderId(settings?.selectedFolderId || 'all');
  }, [settings?.selectedFolderId]);

  useEffect(() => {
    if (settings?.structureMode) {
      setStructureMode(settings.structureMode);
    }
  }, [settings?.structureMode]);

  useEffect(() => {
    if (settings?.tileShape) {
      setTileShape(settings.tileShape);
    }
  }, [settings?.tileShape]);

  useEffect(() => {
    if (settings?.viewMode) {
      setViewMode(settings.viewMode);
    }
  }, [settings?.viewMode]);

  useEffect(() => {
    if (settings?.activeTab) {
      setActiveSubTab(settings.activeTab);
    }
  }, [settings?.activeTab]);

  // Загрузка открытых вкладок браузера
  const loadOpenTabs = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({}, (tabs) => {
        if (!tabs) return;
        setOpenTabs(
          tabs.map((t) => ({
            id: t.id || 0,
            title: t.title || t.url || 'Вкладка',
            url: t.url || '',
            favIconUrl: t.favIconUrl,
            active: Boolean(t.active),
          })),
        );
      });
    }
  };

  // Загрузка недавно закрытых вкладок
  const loadRecentlyClosed = () => {
    if (typeof chrome !== 'undefined' && chrome.sessions?.getRecentlyClosed) {
      chrome.sessions.getRecentlyClosed({ maxResults: 20 }, (sessions) => {
        if (!sessions) return;
        const items: RecentlyClosedItem[] = [];
        sessions.forEach((s, idx) => {
          if (s.tab) {
            items.push({
              id: s.tab.sessionId || String(idx),
              sessionId: s.tab.sessionId || '',
              title: s.tab.title || s.tab.url || 'Вкладка',
              url: s.tab.url || '',
              lastModified: s.lastModified || Date.now(),
            });
          } else if (s.window && s.window.tabs) {
            s.window.tabs.forEach((t, tIdx) => {
              items.push({
                id: t.sessionId || `${idx}-${tIdx}`,
                sessionId: t.sessionId || '',
                title: t.title || t.url || 'Вкладка',
                url: t.url || '',
                lastModified: s.lastModified || Date.now(),
              });
            });
          }
        });
        setRecentlyClosed(items);
      });
    }
  };

  useEffect(() => {
    if (activeSubTab === 'openTabs') loadOpenTabs();
    if (activeSubTab === 'recent') loadRecentlyClosed();
  }, [activeSubTab]);

  // Если режим Одиночный сайт — рендерим SingleBookmarkTile
  if (mode === 'single') {
    return <SingleBookmarkTile instanceId={instanceId} settings={settings} />;
  }

  // Извлечение всех папок
  const allAvailableFolders = extractBookmarkFolders(tree);

  // Рекурсивный поиск папки по ID
  const findFolderById = (nodes: BookmarkNode[], id: string): BookmarkNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFolderById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Получение элементов в зависимости от текущей папки и режима структуры
  const getRawItems = (): (BookmarkNode & { folderName?: string })[] => {
    if (folderSource === 'custom') {
      return customLinks.map((l) => ({
        id: l.id,
        title: l.title,
        url: l.url,
      }));
    }

    if (currentFolderId === 'all') {
      if (structureMode === 'flatten') {
        return flattenBookmarkNodes(tree);
      }
      return tree;
    }

    const folder = findFolderById(tree, currentFolderId);
    if (!folder) {
      return structureMode === 'flatten' ? flattenBookmarkNodes(tree) : tree;
    }

    if (structureMode === 'flatten') {
      return flattenBookmarkNodes(folder.children || [], folder.title);
    }

    return folder.children || [];
  };

  const rawItems = getRawItems();
  const currentSelectedFolder = allAvailableFolders.find((f) => f.id === currentFolderId);

  // Фильтрация поиска закладок
  const items = rawItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.url && item.url.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const filteredOpenTabs = openTabs.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.url.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredRecent = recentlyClosed.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.url.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const targetFolderId = currentFolderId === 'all' ? (tree[0]?.id || '1') : currentFolderId;

    if (folderSource === 'chrome') {
      if (isFolderType) {
        await createFolder(targetFolderId, newTitle.trim());
      } else if (newUrl.trim()) {
        let formattedUrl = newUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = `https://${formattedUrl}`;
        }
        await createBookmark(targetFolderId, newTitle.trim(), formattedUrl);
      }
    } else {
      const newLink: CustomBookmarkLink = {
        id: `link-${Date.now()}`,
        title: newTitle.trim(),
        url: newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`,
      };
      setCustomLinks((prev) => [...prev, newLink]);
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

  const switchToOpenTab = (tabId: number) => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
      chrome.tabs.update(tabId, { active: true });
    }
  };

  const handleItemClick = (item: { id: string; url?: string; children?: unknown }) => {
    if (item.children && structureMode === 'tree') {
      setCurrentFolderId(item.id);
    } else if (item.url) {
      if (openInNewTab) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = item.url;
      }
    }
  };

  // Сохранить все открытые вкладки в текущую папку
  const saveAllOpenTabsToFolder = async () => {
    const targetFolderId = currentFolderId === 'all' ? (tree[0]?.id || '1') : currentFolderId;

    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({}, async (tabs) => {
        if (!tabs) return;
        for (const t of tabs) {
          if (t.url && t.title && !t.url.startsWith('chrome://')) {
            if (folderSource === 'chrome') {
              await createBookmark(targetFolderId, t.title, t.url);
            } else {
              setCustomLinks((prev) => [
                ...prev,
                { id: `tab-${Date.now()}-${t.id}`, title: t.title || 'Вкладка', url: t.url || '' },
              ]);
            }
          }
        }
        setIsAddingItem(false);
      });
    }
  };

  // Вычисление классов плиток и сетки
  const tileClasses = getBookmarkTileClasses({
    tileShape,
    tileSize,
    cardStyle,
    borderRadius,
    hoverEffect,
    iconSize,
    columns,
  });

  const gridClass = getBookmarkGridClass(columns, tileShape);
  const isSpeedDialShape = tileShape === 'square' || tileShape === 'circle';

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* === ВЕРХНИЙ ТУЛБАР: НАВИГАЦИЯ, ВКЛАДКИ И ИНСТРУМЕНТЫ === */}
      <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        {/* Левая часть: переключатель вкладок (folder-tabs) или умный хлебный крошек (folder) */}
        {mode === 'folder-tabs' ? (
          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setActiveSubTab('bookmarks')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                activeSubTab === 'bookmarks'
                  ? 'bg-primary text-primary-fg shadow-1'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              <BookmarkIcon className="w-3.5 h-3.5" />
              <span>Закладки</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('openTabs')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                activeSubTab === 'openTabs'
                  ? 'bg-primary text-primary-fg shadow-1'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Вкладки</span>
              {openTabs.length > 0 && (
                <Badge variant="secondary">
                  {openTabs.length}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('recent')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                activeSubTab === 'recent'
                  ? 'bg-primary text-primary-fg shadow-1'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Недавние</span>
            </button>
          </div>
        ) : (
          /* Интегрированная навигация по папкам */
          <div className="flex items-center gap-1.5 min-w-0" ref={folderMenuRef}>
            {structureMode === 'tree' && currentFolderId !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setCurrentFolderId('all');
                  onUpdateSettings?.({ selectedFolderId: 'all' });
                }}
                className="p-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-line text-primary hover:text-primary-hover transition-colors cursor-pointer shrink-0"
                title="Назад ко всем папкам"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-line text-xs font-semibold text-fg transition-colors cursor-pointer max-w-[200px]"
              >
                <Folder className="w-3.5 h-3.5 text-warning shrink-0" />
                <span className="truncate">
                  {currentFolderId === 'all'
                    ? 'Все папки закладок'
                    : currentSelectedFolder?.title || 'Папка'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-fg-muted shrink-0 ml-0.5" />
              </button>

              {isFolderMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-surface border border-line shadow-3 rounded-xl p-1.5 z-50 backdrop-blur-xl space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFolderId('all');
                      setIsFolderMenuOpen(false);
                      onUpdateSettings?.({ selectedFolderId: 'all' });
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 truncate cursor-pointer',
                      currentFolderId === 'all'
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'hover:bg-surface-hover text-fg',
                    )}
                  >
                    <Folder className="w-4 h-4 text-warning shrink-0" />
                    <span className="truncate">📁 Все папки закладок</span>
                  </button>

                  {allAvailableFolders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setCurrentFolderId(f.id);
                        setIsFolderMenuOpen(false);
                        onUpdateSettings?.({ selectedFolderId: f.id });
                      }}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 truncate cursor-pointer',
                        currentFolderId === f.id
                          ? 'bg-primary text-primary-fg font-semibold'
                          : 'hover:bg-surface-hover text-fg',
                      )}
                    >
                      <Folder className="w-4 h-4 text-warning shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Правая панель инструментов: Поиск, Форма плиток, Дерево/Список, Правка, Добавить */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {/* Поиск с кнопкой очистки */}
          {showSearch && (
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-fg-muted absolute left-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded-lg pl-7 pr-6 py-1 w-20 sm:w-28 focus:w-36 transition-all focus-visible:outline-none focus-visible:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 text-fg-muted hover:text-fg p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Быстрое переключение формы и вида закладок */}
          {activeSubTab === 'bookmarks' && (
            <div className="relative" ref={styleMenuRef}>
              <button
                type="button"
                onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
                title="Внешний вид и форма закладок"
                className={cn(
                  'p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1',
                  isStyleMenuOpen
                    ? 'bg-primary text-primary-fg border-primary shadow-1'
                    : 'bg-surface hover:bg-surface-hover border-line text-fg',
                )}
              >
                {viewMode === 'list' ? (
                  <List className="w-3.5 h-3.5" />
                ) : tileShape === 'square' ? (
                  <Square className="w-3.5 h-3.5" />
                ) : tileShape === 'circle' ? (
                  <Circle className="w-3.5 h-3.5" />
                ) : tileShape === 'pill' ? (
                  <Columns2 className="w-3.5 h-3.5" />
                ) : (
                  <LayoutGrid className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Меню быстрых пресетов формы закладок */}
              {isStyleMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-line shadow-3 rounded-xl p-1.5 z-50 backdrop-blur-xl space-y-1 text-xs">
                  <div className="px-2 py-1 text-[10px] font-bold text-fg-muted uppercase tracking-wider">
                    Вид закладок
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('tiles');
                      setTileShape('rectangle-horizontal');
                      setIsStyleMenuOpen(false);
                      onUpdateSettings?.({ viewMode: 'tiles', tileShape: 'rectangle-horizontal' });
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                      viewMode === 'tiles' && tileShape === 'rectangle-horizontal'
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'hover:bg-surface-hover text-fg',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5" /> Карточки
                    </span>
                    {viewMode === 'tiles' && tileShape === 'rectangle-horizontal' && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('tiles');
                      setTileShape('square');
                      setIsStyleMenuOpen(false);
                      onUpdateSettings?.({ viewMode: 'tiles', tileShape: 'square' });
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                      viewMode === 'tiles' && tileShape === 'square'
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'hover:bg-surface-hover text-fg',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Square className="w-3.5 h-3.5" /> Квадраты (1:1)
                    </span>
                    {viewMode === 'tiles' && tileShape === 'square' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('tiles');
                      setTileShape('rectangle-vertical');
                      setIsStyleMenuOpen(false);
                      onUpdateSettings?.({ viewMode: 'tiles', tileShape: 'rectangle-vertical' });
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                      viewMode === 'tiles' && tileShape === 'rectangle-vertical'
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'hover:bg-surface-hover text-fg',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Columns2 className="w-3.5 h-3.5" /> Постеры
                    </span>
                    {viewMode === 'tiles' && tileShape === 'rectangle-vertical' && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('tiles');
                      setTileShape('circle');
                      setIsStyleMenuOpen(false);
                      onUpdateSettings?.({ viewMode: 'tiles', tileShape: 'circle' });
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                      viewMode === 'tiles' && tileShape === 'circle'
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'hover:bg-surface-hover text-fg',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Circle className="w-3.5 h-3.5" /> Круглые иконки
                    </span>
                    {viewMode === 'tiles' && tileShape === 'circle' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('tiles');
                      setTileShape('pill');
                      setIsStyleMenuOpen(false);
                      onUpdateSettings?.({ viewMode: 'tiles', tileShape: 'pill' });
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                      viewMode === 'tiles' && tileShape === 'pill'
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'hover:bg-surface-hover text-fg',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Columns2 className="w-3.5 h-3.5" /> Капсулы
                    </span>
                    {viewMode === 'tiles' && tileShape === 'pill' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('list');
                      setIsStyleMenuOpen(false);
                      onUpdateSettings?.({ viewMode: 'list' });
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer',
                      viewMode === 'list'
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'hover:bg-surface-hover text-fg',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <List className="w-3.5 h-3.5" /> Список
                    </span>
                    {viewMode === 'list' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Структура / Плоский список */}
          {activeSubTab === 'bookmarks' && (
            <div className="flex items-center gap-0.5 bg-surface p-0.5 rounded-lg border border-line">
              <button
                type="button"
                onClick={() => {
                  setStructureMode('tree');
                  onUpdateSettings?.({ structureMode: 'tree' });
                }}
                title="Иерархическая структура с папками"
                className={cn(
                  'p-1.5 rounded-md text-xs transition-colors cursor-pointer',
                  structureMode === 'tree'
                    ? 'bg-primary text-primary-fg'
                    : 'text-fg-muted hover:text-fg',
                )}
              >
                <FolderTree className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setStructureMode('flatten');
                  onUpdateSettings?.({ structureMode: 'flatten' });
                }}
                title="Все ссылки одним плоским списком"
                className={cn(
                  'p-1.5 rounded-md text-xs transition-colors cursor-pointer',
                  structureMode === 'flatten'
                    ? 'bg-primary text-primary-fg'
                    : 'text-fg-muted hover:text-fg',
                )}
              >
                <ListFilter className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Режим правки */}
          {activeSubTab === 'bookmarks' && (
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              title={isEditMode ? 'Завершить редактирование' : 'Редактировать / Удалить закладки'}
              className={cn(
                'p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1',
                isEditMode
                  ? 'bg-warning/20 border-warning text-warning'
                  : 'bg-surface hover:bg-surface-hover border-line text-fg-muted hover:text-fg',
              )}
            >
              {isEditMode ? <Check className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
            </button>
          )}

          {mode === 'folder-tabs' && activeSubTab === 'openTabs' && (
            <Button
              size="sm"
              variant="secondary"
              aria-label="Сохранить вкладки в папку"
              onClick={saveAllOpenTabsToFolder}
              icon={<Save className="w-4 h-4" />}
            />
          )}

          {activeSubTab === 'bookmarks' && (
            <Button
              size="sm"
              variant="primary"
              aria-label="Добавить элемент"
              onClick={() => setIsAddingItem(!isAddingItem)}
              icon={<Plus className="w-4 h-4" />}
            />
          )}
        </div>
      </div>

      {/* Форма добавления закладки */}
      {activeSubTab === 'bookmarks' && isAddingItem && (
        <form onSubmit={handleCreate} className="p-3 rounded-xl bg-surface border border-line space-y-2.5 shadow-2">
          {folderSource === 'chrome' && (
            <div className="flex items-center gap-3 text-xs text-fg">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={!isFolderType}
                  onChange={() => setIsFolderType(false)}
                  className="text-primary"
                />
                <span>Ссылка</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
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
          )}

          <input
            type="text"
            placeholder="Название"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-surface text-xs text-fg border border-line rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:border-primary"
            autoFocus
          />

          {!isFolderType && (
            <input
              type="text"
              placeholder="URL (https://...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full bg-surface text-xs text-fg border border-line rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:border-primary"
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

      {/* === ОСНОВНОЙ КОНТЕНТ ЗАКЛАДОК И ВКЛАДОК === */}
      {activeSubTab === 'bookmarks' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <EmptyState
              title="Нет закладок"
              description={searchQuery ? 'Ничего не найдено по запросу' : 'В этой папке пока нет элементов'}
            />
          ) : viewMode === 'tiles' ? (
            /* Универсальная плиточная сетка */
            <div className={gridClass}>
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn('relative', tileClasses.containerClass)}
                  title={`${item.title}${item.url ? `\n${item.url}` : ''}`}
                >
                  {/* Иконка / Фавикон */}
                  {showIcon && (
                    <div className={tileClasses.iconContainerClass}>
                      <BookmarkFavicon
                        title={item.title}
                        url={item.url}
                        isFolder={Boolean(item.children)}
                        imgClass={tileClasses.iconImgClass}
                      />

                      {/* Кнопка удаления в Speed Dial режиме (floating badge на иконке) */}
                      {isEditMode && isSpeedDialShape && (
                        <button
                          type="button"
                          aria-label="Удалить элемент"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (folderSource === 'chrome') {
                              deleteBookmark(item.id);
                            } else {
                              setCustomLinks((prev) => prev.filter((l) => l.id !== item.id));
                            }
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-90 transition-transform cursor-pointer z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Текстовый блок (название / домен) */}
                  {(showTitle || showUrl) && (
                    <div
                      className={cn(
                        'min-w-0',
                        isSpeedDialShape
                          ? 'w-full text-center mt-1'
                          : 'flex-1 flex flex-col justify-center',
                      )}
                    >
                      {showTitle && (
                        <span className={tileClasses.titleClass}>
                          {item.title || item.url || 'Закладка'}
                        </span>
                      )}
                      {!isSpeedDialShape && showUrl && (
                        <span className={tileClasses.urlClass}>
                          {structureMode === 'flatten' && item.folderName
                            ? item.folderName
                            : item.children
                              ? 'Папка'
                              : item.url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Кнопка удаления для обычных карточек */}
                  {isEditMode && !isSpeedDialShape && (
                    <button
                      type="button"
                      aria-label="Удалить элемент"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (folderSource === 'chrome') {
                          deleteBookmark(item.id);
                        } else {
                          setCustomLinks((prev) => prev.filter((l) => l.id !== item.id));
                        }
                      }}
                      className="p-1 text-danger hover:bg-danger/10 rounded-lg shrink-0 transition-colors cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Иконка внешней ссылки при наведении для карточек */}
                  {!isEditMode && !isSpeedDialShape && item.url && (
                    <ExternalLink className="w-3.5 h-3.5 text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Классический строчный список */
            <div className="flex flex-col gap-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-surface/70 hover:bg-surface border border-line hover:border-primary/50 transition-all cursor-pointer select-none backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center shrink-0 border border-line/40 overflow-hidden">
                      <BookmarkFavicon
                        title={item.title}
                        url={item.url}
                        isFolder={Boolean(item.children)}
                        imgClass="w-4 h-4"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-fg truncate block group-hover:text-primary transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-fg-muted truncate block">
                        {structureMode === 'flatten' && item.folderName
                          ? item.folderName
                          : item.children
                            ? 'Папка'
                            : item.url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                      </span>
                    </div>
                  </div>

                  {isEditMode ? (
                    <button
                      type="button"
                      aria-label="Удалить закладку"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (folderSource === 'chrome') {
                          deleteBookmark(item.id);
                        } else {
                          setCustomLinks((prev) => prev.filter((l) => l.id !== item.id));
                        }
                      }}
                      className="p-1.5 text-danger hover:bg-danger/10 rounded-lg shrink-0 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Открытые вкладки браузера */}
      {activeSubTab === 'openTabs' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {filteredOpenTabs.length === 0 ? (
            <EmptyState
              title="Нет открытых вкладок"
              description="Здесь отображаются вкладки активного окна Chrome"
            />
          ) : viewMode === 'tiles' ? (
            <div className={gridClass}>
              {filteredOpenTabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => switchToOpenTab(tab.id)}
                  className={cn('relative', tileClasses.containerClass)}
                  title={`${tab.title}\n${tab.url}`}
                >
                  {showIcon && (
                    <div className={tileClasses.iconContainerClass}>
                      <BookmarkFavicon
                        title={tab.title}
                        url={tab.url}
                        favIconUrl={tab.favIconUrl}
                        imgClass={tileClasses.iconImgClass}
                      />
                    </div>
                  )}
                  {(showTitle || showUrl) && (
                    <div
                      className={cn(
                        'min-w-0',
                        isSpeedDialShape
                          ? 'w-full text-center mt-1'
                          : 'flex-1 flex flex-col justify-center',
                      )}
                    >
                      {showTitle && <span className={tileClasses.titleClass}>{tab.title}</span>}
                      {!isSpeedDialShape && showUrl && (
                        <span className={tileClasses.urlClass}>{tab.url}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredOpenTabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => switchToOpenTab(tab.id)}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-surface/70 hover:bg-surface border border-line hover:border-primary/50 transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center shrink-0 border border-line/40 overflow-hidden">
                      <BookmarkFavicon
                        title={tab.title}
                        url={tab.url}
                        favIconUrl={tab.favIconUrl}
                        imgClass="w-4 h-4"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-fg truncate block group-hover:text-primary transition-colors">
                        {tab.title}
                      </span>
                      <span className="text-[10px] text-fg-muted truncate block">{tab.url}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Недавно закрытые вкладки */}
      {activeSubTab === 'recent' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {filteredRecent.length === 0 ? (
            <EmptyState
              title="Нет недавних вкладок"
              description="Здесь появятся недавно закрытые страницы Chrome"
            />
          ) : viewMode === 'tiles' ? (
            <div className={gridClass}>
              {filteredRecent.map((item) => (
                <div
                  key={item.id}
                  onClick={() => restoreTab(item)}
                  className={cn('relative', tileClasses.containerClass)}
                  title={`${item.title}\n${item.url}`}
                >
                  {showIcon && (
                    <div className={tileClasses.iconContainerClass}>
                      <BookmarkFavicon
                        title={item.title}
                        url={item.url}
                        imgClass={tileClasses.iconImgClass}
                      />
                    </div>
                  )}
                  {(showTitle || showUrl) && (
                    <div
                      className={cn(
                        'min-w-0',
                        isSpeedDialShape
                          ? 'w-full text-center mt-1'
                          : 'flex-1 flex flex-col justify-center',
                      )}
                    >
                      {showTitle && <span className={tileClasses.titleClass}>{item.title}</span>}
                      {!isSpeedDialShape && showUrl && (
                        <span className={tileClasses.urlClass}>{item.url}</span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Восстановить вкладку"
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreTab(item);
                    }}
                    className={cn(
                      'p-1 text-fg-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-all cursor-pointer shrink-0',
                      isSpeedDialShape && 'absolute top-1 right-1 bg-surface/90 shadow-1',
                    )}
                    title="Восстановить вкладку"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredRecent.map((item) => (
                <div
                  key={item.id}
                  onClick={() => restoreTab(item)}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-surface/70 hover:bg-surface border border-line hover:border-primary/50 transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center shrink-0 border border-line/40 overflow-hidden">
                      <BookmarkFavicon title={item.title} url={item.url} imgClass="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-fg truncate block group-hover:text-primary transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-fg-muted truncate block">{item.url}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Восстановить вкладку"
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreTab(item);
                    }}
                    className="p-1.5 text-fg-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-all cursor-pointer shrink-0"
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
