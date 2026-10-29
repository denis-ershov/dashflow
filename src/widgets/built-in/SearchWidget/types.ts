import type { SearchEngineId } from '@/core/search';

/** Набор поисковиков общий с поиском в Hero — см. src/core/search */
export type SearchEngine = SearchEngineId;
export type { SearchEngineId };

export interface SearchSettings {
  engine?: SearchEngine;
  searchStyle?: 'bar' | 'tiles';
  showEngineSelector?: boolean;
  showSearchButton?: boolean;
  openInNewTab?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  showHotkeyBadge?: boolean;
}
