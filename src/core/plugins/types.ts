export type DeclarativePluginType = 'rss' | 'embed' | 'links' | 'api';

export type PluginPermission = 'storage' | 'network' | 'bookmarks';

export interface RssPluginConfig {
  feedUrl: string;
  maxItems?: number;
  enableThumbnails?: boolean;
}

export interface EmbedPluginConfig {
  url: string;
  allowScripts?: boolean;
  zoom?: number;
}

export interface LinksPluginItem {
  title: string;
  url: string;
  icon?: string;
}

export interface LinksPluginConfig {
  links: LinksPluginItem[];
}

export interface ApiPluginConfig {
  endpoint: string;
  intervalMs?: number;
  titlePath?: string;
  valuePath?: string;
  unit?: string;
}

export interface DeclarativePluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  type: DeclarativePluginType;
  description: string;
  permissions: PluginPermission[];
  icon?: string;
  size: {
    defaultW: number;
    defaultH: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
  surface?: 'chromeless' | 'panel' | 'tiles';
  config: RssPluginConfig | EmbedPluginConfig | LinksPluginConfig | ApiPluginConfig;
}
