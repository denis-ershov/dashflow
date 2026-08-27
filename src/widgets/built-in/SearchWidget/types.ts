export type SearchEngineId = 'google' | 'yandex' | 'duckduckgo' | 'bing' | 'youtube' | 'github';

export interface SearchSettings {
  engine: SearchEngineId;
}
