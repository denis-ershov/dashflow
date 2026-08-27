export interface BookmarkSettings {
  mode?: 'single' | 'folder' | 'internal';
  selectedFolderId?: string;
  viewMode?: 'tiles' | 'list' | 'table';
  singleTitle?: string;
  singleUrl?: string;
  singleIconUrl?: string;
  showTitle?: boolean;
  showIcon?: boolean;
}
