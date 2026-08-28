export interface RssFeedConfig {
  id: string;
  name: string;
  url: string;
  folder?: string;
  enabled?: boolean;
  color?: string;
  icon?: string;
}

export interface RssItem {
  id?: string;
  title: string;
  link: string;
  pubDate?: string;
  timestamp?: number;
  feedId?: string;
  feedName?: string;
  feedColor?: string;
  folder?: string;
  thumbnail?: string;
  description?: string;
  author?: string;
}

export type RssReadingMode = 'unified' | 'feed-tabs' | 'folders';

export type RssViewMode = 'thumbnails' | 'compact' | 'cards' | 'grid' | 'magazine';

export type RssCardStyle = 'glass' | 'solid' | 'outline' | 'transparent';

export type RssBorderRadius = 'none' | 'sm' | 'md' | 'lg';

export interface RssSettings {
  /** Список настроенных лент новостей */
  feeds?: RssFeedConfig[];

  /** Устаревшие поля для обратной совместимости */
  feedUrl?: string;
  feedUrls?: string[];

  /** Режим чтения: unified (единая лента) | feed-tabs (по лентам) | folders (по папкам/темам) */
  readingMode?: RssReadingMode;

  /** Текущая активная папка (для режима folders) */
  activeFolder?: string;

  /** Текущая активная лента (для режима feed-tabs) */
  activeFeedId?: string;

  /** Стиль макета отображения новостей */
  viewMode?: RssViewMode;

  /** Стиль подложки карточек */
  cardStyle?: RssCardStyle;

  /** Радиус скругления */
  borderRadius?: RssBorderRadius;

  /** Количество загружаемых новостей с каждой ленты */
  itemCount?: number;

  /** Показывать миниатюры (изображения) */
  showThumbnails?: boolean;

  /** Показывать краткое описание новости */
  showDescription?: boolean;

  /** Показывать источник новости (название ленты) */
  showSource?: boolean;

  /** Показывать дату/время публикации */
  showDate?: boolean;

  /** Открывать новости в новой вкладке */
  openInNewTab?: boolean;

  /** Показывать строку поиска в шапке */
  showSearch?: boolean;

  /** Интервал автоматического обновления в минутах (0 = только вручную) */
  refreshInterval?: number;
}

