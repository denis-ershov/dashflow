export type SearchEngine =
  | 'google'
  | 'yandex'
  | 'duckduckgo'
  | 'bing'
  | 'github'
  | 'youtube'
  | 'perplexity';

export type SearchEngineId = SearchEngine;

export interface SearchSettings {
  engine?: SearchEngine;
  searchStyle?: 'bar' | 'tiles';
  showEngineSelector?: boolean;
  showSearchButton?: boolean;
  openInNewTab?: boolean;
  placeholder?: string;
}
