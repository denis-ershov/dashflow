import React from 'react';
import { Code, Globe, Sparkles, Youtube } from 'lucide-react';
import { isSafeHttpUrl } from '@/core/network';

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
  name: string;
  /** Префикс запроса; к нему добавляется encodeURIComponent(query) */
  url: string;
  placeholder: string;
  icon: React.ReactNode;
}

const ICON = 'w-4 h-4';

/** Единый реестр поисковиков для поиска в Hero и виджета «Поиск» */
export const SEARCH_ENGINES: Readonly<Record<SearchEngineId, SearchEngine>> = {
  google: {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    placeholder: 'Искать в Google или ввести URL...',
    icon: <Globe className={`${ICON} text-primary`} />,
  },
  yandex: {
    id: 'yandex',
    name: 'Яндекс',
    url: 'https://yandex.ru/search/?text=',
    placeholder: 'Искать в Яндексе...',
    icon: <Globe className={`${ICON} text-warning`} />,
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    placeholder: 'Приватный поиск в DuckDuckGo...',
    icon: <Globe className={`${ICON} text-secondary`} />,
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    placeholder: 'Искать в Microsoft Bing...',
    icon: <Globe className={`${ICON} text-primary`} />,
  },
  github: {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/search?q=',
    placeholder: 'Поиск репозиториев и кода...',
    icon: <Code className={`${ICON} text-fg`} />,
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=',
    placeholder: 'Искать видео на YouTube...',
    icon: <Youtube className={`${ICON} text-danger`} />,
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai/search?q=',
    placeholder: 'Спросить у AI ассистента...',
    icon: <Sparkles className={`${ICON} text-accent`} />,
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/?q=',
    placeholder: 'Спросить у ChatGPT...',
    icon: <Sparkles className={`${ICON} text-success`} />,
  },
  claude: {
    id: 'claude',
    name: 'Claude AI',
    url: 'https://claude.ai/new?q=',
    placeholder: 'Спросить у Claude AI...',
    icon: <Sparkles className={`${ICON} text-warning`} />,
  },
  brave: {
    id: 'brave',
    name: 'Brave Search',
    url: 'https://search.brave.com/search?q=',
    placeholder: 'Искать в Brave Search...',
    icon: <Globe className={`${ICON} text-danger`} />,
  },
};

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
