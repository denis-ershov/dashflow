import { create } from 'zustand';

export interface BookmarkNode {
  id: string;
  parentId?: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
}

export interface BookmarkFolderOption {
  id: string;
  title: string;
  path: string;
}

/**
 * Рекурсивно извлекает список всех папок из дерева закладок с полным путём
 */
export function extractBookmarkFolders(
  nodes: BookmarkNode[],
  parentPath = '',
): BookmarkFolderOption[] {
  const folders: BookmarkFolderOption[] = [];

  for (const node of nodes) {
    if (node.children) {
      const currentPath = parentPath ? `${parentPath} / ${node.title}` : node.title;
      folders.push({
        id: node.id,
        title: node.title,
        path: currentPath,
      });
      folders.push(...extractBookmarkFolders(node.children, currentPath));
    }
  }

  return folders;
}

/**
 * Рекурсивно собирает все закладки (листья с URL) из дерева/подпапки в единый плоский список
 */
export function flattenBookmarkNodes(
  nodes: BookmarkNode[],
  folderName = '',
): Array<BookmarkNode & { folderName?: string }> {
  const result: Array<BookmarkNode & { folderName?: string }> = [];

  for (const node of nodes) {
    if (node.url) {
      result.push({
        ...node,
        folderName: folderName || undefined,
      });
    }
    if (node.children) {
      result.push(...flattenBookmarkNodes(node.children, node.title));
    }
  }

  return result;
}

interface ChromeBookmarksState {
  tree: BookmarkNode[];
  isLoaded: boolean;
  loadTree: () => void;
  createBookmark: (parentId: string, title: string, url: string) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  renameBookmark: (id: string, newTitle: string, newUrl?: string) => Promise<void>;
  createFolder: (parentId: string, title: string) => Promise<void>;
}

export const useChromeBookmarksStore = create<ChromeBookmarksState>()((set) => {
  const loadTree = () => {
    if (typeof chrome !== 'undefined' && chrome.bookmarks?.getTree) {
      chrome.bookmarks.getTree((nodes) => {
        if (nodes && nodes[0] && nodes[0].children) {
          set({ tree: nodes[0].children, isLoaded: true });
        }
      });
    } else {
      // Имитация дерева закладок для Dev-режима без ошибок
      set({
        isLoaded: true,
        tree: [
          {
            id: '1',
            title: 'Панель закладок',
            children: [
              { id: '10', title: 'DashFlow GitHub', url: 'https://github.com' },
              { id: '11', title: 'React 19 Documentation', url: 'https://react.dev' },
              { id: '12', title: 'WXT Framework', url: 'https://wxt.dev' },
              { id: '13', title: 'TailwindCSS v4', url: 'https://tailwindcss.com' },
              {
                id: '14',
                title: 'Разработка',
                children: [
                  { id: '140', title: 'Vite Guide', url: 'https://vite.dev' },
                  { id: '141', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
                ],
              },
            ],
          },
          {
            id: '2',
            title: 'Другие закладки',
            children: [
              { id: '20', title: 'Habr IT', url: 'https://habr.com' },
              { id: '21', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
            ],
          },
        ],
      });
    }
  };

  // Регистрация подписок на события Chrome Bookmarks API для реального 2-way sync
  if (typeof chrome !== 'undefined' && chrome.bookmarks) {
    chrome.bookmarks.onCreated.addListener(() => loadTree());
    chrome.bookmarks.onRemoved.addListener(() => loadTree());
    chrome.bookmarks.onChanged.addListener(() => loadTree());
    chrome.bookmarks.onMoved.addListener(() => loadTree());
    chrome.bookmarks.onChildrenReordered?.addListener(() => loadTree());
  }

  return {
    tree: [],
    isLoaded: false,
    loadTree,

    createBookmark: async (parentId, title, url) => {
      if (typeof chrome !== 'undefined' && chrome.bookmarks?.create) {
        await chrome.bookmarks.create({ parentId, title, url });
      }
    },

    deleteBookmark: async (id) => {
      if (typeof chrome !== 'undefined' && chrome.bookmarks?.remove) {
        await chrome.bookmarks.remove(id);
      }
    },

    renameBookmark: async (id, newTitle, newUrl) => {
      if (typeof chrome !== 'undefined' && chrome.bookmarks?.update) {
        await chrome.bookmarks.update(id, { title: newTitle, url: newUrl });
      }
    },

    createFolder: async (parentId, title) => {
      if (typeof chrome !== 'undefined' && chrome.bookmarks?.create) {
        await chrome.bookmarks.create({ parentId, title });
      }
    },
  };
});
