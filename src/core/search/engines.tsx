import React from 'react';
import { Code, Globe, Sparkles, Youtube } from 'lucide-react';
import { isSafeHttpUrl } from '@/core/network';
import type { TranslationKey } from '@/core/i18n';

export type SearchEngineId =
  | 'google'
  | 'yandex'
  | 'duckduckgo'
  | 'bing'
  | 'github'
  | 'youtube'
  | 'perplexity'
  | 'chatgpt'
  | 'claude'
  | 'brave';

export interface SearchEngine {
  id: SearchEngineId;
  /** Название бренда; для брендов с локализованным именем задан nameKey */
  name: string;
  nameKey?: TranslationKey;
  /** Префикс запроса; к нему добавляется encodeURIComponent(query) */
  url: string;
  placeholderKey: TranslationKey;
  icon: React.ReactNode;
}

const ICON = 'w-4 h-4';

/** Единый реестр поисковиков для поиска в Hero и виджета «Поиск» */
export const SEARCH_ENGINES: Readonly<Record<SearchEngineId, SearchEngine>> = {
  google: {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    placeholderKey: 'search.engines.google',
    icon: <Globe className={`${ICON} text-primary`} />,
  },
  yandex: {
    id: 'yandex',
    name: 'Yandex',
    nameKey: 'search.engines.yandexName',
    url: 'https://yandex.ru/search/?text=',
    placeholderKey: 'search.engines.yandex',
    icon: <Globe className={`${ICON} text-warning`} />,
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    placeholderKey: 'search.engines.duckduckgo',
    icon: <Globe className={`${ICON} text-secondary`} />,
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    placeholderKey: 'search.engines.bing',
    icon: <Globe className={`${ICON} text-primary`} />,
  },
  github: {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/search?q=',
    placeholderKey: 'search.engines.github',
    icon: <Code className={`${ICON} text-fg`} />,
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=',
    placeholderKey: 'search.engines.youtube',
    icon: <Youtube className={`${ICON} text-danger`} />,
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai/search?q=',
    placeholderKey: 'search.engines.perplexity',
    icon: <Sparkles className={`${ICON} text-accent`} />,
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/?q=',
    placeholderKey: 'search.engines.chatgpt',
    icon: <Sparkles className={`${ICON} text-success`} />,
  },
  claude: {
    id: 'claude',
    name: 'Claude AI',
    url: 'https://claude.ai/new?q=',
    placeholderKey: 'search.engines.claude',
    icon: <Sparkles className={`${ICON} text-warning`} />,
  },
  brave: {
    id: 'brave',
    name: 'Brave Search',
    url: 'https://search.brave.com/search?q=',
    placeholderKey: 'search.engines.brave',
    icon: <Globe className={`${ICON} text-danger`} />,
  },
};

/** Отображаемое имя поисковика с учётом локализованных брендов */
export function getEngineName(
  engine: SearchEngine,
  translate: (key: TranslationKey) => string,
): string {
  return engine.nameKey ? translate(engine.nameKey) : engine.name;
}

export const SEARCH_ENGINE_LIST: readonly SearchEngine[] = Object.values(SEARCH_ENGINES);

export function getSearchEngine(id: string | undefined): SearchEngine {
  return id && Object.hasOwn(SEARCH_ENGINES, id)
    ? SEARCH_ENGINES[id as SearchEngineId]
    : SEARCH_ENGINES.google;
}

/** Домен без схемы: example.com, docs.example.co.uk/path, example.com:8080 */
const BARE_DOMAIN = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:\d{1,5})?([/?#]\S*)?$/i;

/**
 * Куда вести пользователя по строке из поиска: адрес — напрямую, остальное — в поисковик.
 * Пустая строка — null. Ссылки со схемами кроме http(s) не открываются напрямую, а ищутся.
 */
export function resolveSearchTarget(query: string, engine: SearchEngine): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) && isSafeHttpUrl(trimmed)) return trimmed;
  if (BARE_DOMAIN.test(trimmed) && isSafeHttpUrl(`https://${trimmed}`)) return `https://${trimmed}`;

  return `${engine.url}${encodeURIComponent(trimmed)}`;
}

export function openSearchTarget(url: string, inNewTab: boolean): void {
  if (inNewTab) {
    // noopener: открытая страница не получает доступ к window.opener новой вкладки
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }
}
