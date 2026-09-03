export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export type QuickLinkItem = QuickLink;

export type QuickLinkShape = 'squircle' | 'circle' | 'square';

export interface QuickLinksSettings {
  showTitles?: boolean;
  openInNewTab?: boolean;
  columns?: 2 | 3 | 4 | 6;
  shape?: QuickLinkShape;
  showDomain?: boolean;
  maxRows?: number;
}
