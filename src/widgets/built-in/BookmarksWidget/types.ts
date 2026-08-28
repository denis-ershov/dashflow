export interface CustomBookmarkLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export type BookmarkTileShape =
  | 'rectangle-horizontal'
  | 'square'
  | 'rectangle-vertical'
  | 'circle'
  | 'pill';

export type BookmarkTileSize = 'xs' | 'compact' | 'medium' | 'large' | 'xl';
export type BookmarkCardStyle = 'glass' | 'solid' | 'outline' | 'transparent' | 'glow';
export type BookmarkBorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';
export type BookmarkHoverEffect = 'scale' | 'glow' | 'lift' | 'border' | 'none';
export type BookmarkIconSize = 'small' | 'medium' | 'large';

export interface BookmarkSettings {
  /** Режим работы виджета: 1 сайт = 1 виджет / папка сайтов / папка сайтов и вкладок */
  mode?: 'single' | 'folder' | 'folder-tabs' | 'internal';

  // --- ВНЕШНИЙ ВИД И СТИЛЬ ПЛИТОК (УНИВЕРСАЛЬНАЯ НАСТРОЙКА) ---
  /** Форма плиток: square (квадрат), rectangle-horizontal (горизонт. карточка), rectangle-vertical (вертикальный постер), circle (круг), pill (капсула) */
  tileShape?: BookmarkTileShape;
  /** Размер плиток: compact, medium, large, xl */
  tileSize?: BookmarkTileSize;
  /** Стиль подложки: glass, solid, outline, transparent, glow */
  cardStyle?: BookmarkCardStyle;
  /** Радиус скругления: none, sm (8px), md (14px), lg (20px), full */
  borderRadius?: BookmarkBorderRadius;
  /** Эффект при наведении курсора */
  hoverEffect?: BookmarkHoverEffect;
  /** Размер фавикона / иконки */
  iconSize?: BookmarkIconSize;
  /** Показывать название закладки */
  showTitle?: boolean;
  /** Показывать URL / домен сайта */
  showUrl?: boolean;
  /** Показывать иконку / фавикон */
  showIcon?: boolean;
  /** Количество колонок в сетке (1, 2, 3, 4, 5, 6, auto) */
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto';
  /** Открывать ссылки в новой вкладке */
  openInNewTab?: boolean;

  // --- Настройки для Режима 1 (Одиночный сайт) ---
  singleTitle?: string;
  singleUrl?: string;
  singleIconUrl?: string;
  singleIconType?: 'auto' | 'custom' | 'letter';
  bgStyle?: 'glass' | 'accent' | 'dark' | 'transparent';

  // --- Настройки для Режима 2 (Папка сайтов) ---
  folderSource?: 'chrome' | 'custom';
  /** Выбранная папка ('all' для всех закладок или ID конкретной папки) */
  selectedFolderId?: string;
  folderTitle?: string;
  customLinks?: CustomBookmarkLink[];
  viewMode?: 'tiles' | 'list';
  showSearch?: boolean;

  /** Режим отображения подпапок:
   * 'tree' — иерархическая структура с навигацией по подпапкам
   * 'flatten' — единый сквозной список всех закладок из всех вложенных папок
   */
  structureMode?: 'tree' | 'flatten';

  // --- Настройки для Режима 3 (Папка сайтов и вкладок) ---
  activeTab?: 'bookmarks' | 'openTabs' | 'recent';
  autoSyncOpenTabs?: boolean;
}

export interface RecentlyClosedItem {
  id: string;
  title: string;
  url: string;
  sessionId?: string;
  lastModified?: number;
}

export interface OpenChromeTab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
}
