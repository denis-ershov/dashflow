export interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  timestamp?: number;
  feedName?: string;
  thumbnail?: string;
  description?: string;
}

export type RssViewMode = 'compact' | 'thumbnails' | 'cards';

export interface RssSettings {
  feedUrl?: string;
  feedUrls?: string[];
  viewMode?: RssViewMode;
}
