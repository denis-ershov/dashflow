export interface BookmarkSettings {
  mode?: 'single' | 'folder' | 'internal';
  selectedFolderId?: string;
  viewMode?: 'tiles' | 'list' | 'table';
  singleTitle?: string;
  singleUrl?: string;
  singleIconUrl?: string;
  showTitle?: boolean;
  showIcon?: boolean;
  activeTab?: 'bookmarks' | 'recent';
}

export interface RecentlyClosedItem {
  id: string;
  title: string;
  url: string;
  sessionId?: string;
  lastModified?: number;
}
