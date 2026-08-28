import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/ui/lib/cn';
import { Search, X, ChevronDown, Sparkles, Globe, Code, Video } from 'lucide-react';

export type SearchEngineKey =
  | 'google'
  | 'yandex'
  | 'duckduckgo'
  | 'bing'
  | 'github'
  | 'youtube'
  | 'perplexity';

export interface SearchEngine {
  id: SearchEngineKey;
  name: string;
  url: string;
  placeholder: string;
  icon: React.ReactNode;
}

export const SEARCH_ENGINES: Record<SearchEngineKey, SearchEngine> = {
  google: {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    placeholder: 'Искать в Google или ввести URL...',
    icon: <Globe className="w-4 h-4 text-primary" />,
  },
  yandex: {
    id: 'yandex',
    name: 'Яндекс',
    url: 'https://yandex.ru/search/?text=',
    placeholder: 'Искать в Яндексе...',
    icon: <Globe className="w-4 h-4 text-warning" />,
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    placeholder: 'Приватный поиск в DuckDuckGo...',
    icon: <Globe className="w-4 h-4 text-secondary" />,
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    placeholder: 'Искать в Microsoft Bing...',
    icon: <Globe className="w-4 h-4 text-primary" />,
  },
  github: {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/search?q=',
    placeholder: 'Поиск репозиториев и кода...',
    icon: <Code className="w-4 h-4 text-fg" />,
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=',
    placeholder: 'Искать видео на YouTube...',
    icon: <Video className="w-4 h-4 text-danger" />,
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai/search?q=',
    placeholder: 'Спросить у AI ассистента...',
    icon: <Sparkles className="w-4 h-4 text-accent" />,
  },
};

export interface SearchBar2Props {
  defaultEngine?: SearchEngineKey;
  onEngineChange?: (engine: SearchEngineKey) => void;
  className?: string;
}

export const SearchBar2: React.FC<SearchBar2Props> = ({
  defaultEngine = 'google',
  onEngineChange,
  className,
}) => {
  const [engine, setEngine] = useState<SearchEngineKey>(defaultEngine);
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeEngine = SEARCH_ENGINES[engine] || SEARCH_ENGINES.google;

  // Быстрый фокус по нажатию клавиши '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Закрытие дропдауна при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Если введён валидный URL — перейти напрямую
    if (/^https?:\/\//i.test(trimmed)) {
      window.location.href = trimmed;
      return;
    }

    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(trimmed) && !trimmed.includes(' ')) {
      window.location.href = `https://${trimmed}`;
      return;
    }

    const searchUrl = `${activeEngine.url}${encodeURIComponent(trimmed)}`;
    window.location.href = searchUrl;
  };

  const handleSelectEngine = (newEngine: SearchEngineKey) => {
    setEngine(newEngine);
    onEngineChange?.(newEngine);
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full max-w-2xl mx-auto', className)}>
      <form
        onSubmit={handleSubmit}
        className="glass-panel flex items-center gap-2 px-3 py-2 rounded-2xl border border-line shadow-2 hover:border-line-hover focus-within:border-primary focus-within:shadow-[0_0_24px_var(--dashflow-primary-glow)] transition-all duration-normal"
      >
        {/* Кнопка выбора поисковика */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-label={`Выбрать поисковую систему (текущая: ${activeEngine.name})`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface hover:bg-surface-hover text-fg text-xs font-medium border border-line transition-colors min-h-[36px] cursor-pointer"
          >
            {activeEngine.icon}
            <span className="hidden sm:inline">{activeEngine.name}</span>
            <ChevronDown className="w-4 h-4 text-fg-muted" />
          </button>

          {/* Выпадающее меню поисковиков */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 z-[var(--z-dropdown,30)] w-48 glass-panel rounded-xl shadow-3 border border-line p-2 flex flex-col gap-1">
              {(Object.keys(SEARCH_ENGINES) as SearchEngineKey[]).map((key) => {
                const item = SEARCH_ENGINES[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectEngine(key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer',
                      engine === key
                        ? 'bg-primary text-primary-fg'
                        : 'text-fg hover:bg-surface-hover',
                    )}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Поле ввода */}
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeEngine.placeholder}
            aria-label="Строка поиска"
            className="w-full bg-transparent text-fg placeholder:text-fg-muted text-sm px-2 py-2 focus:outline-none min-h-[36px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
              className="text-fg-muted hover:text-fg p-1 rounded-md hover:bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Кнопка поиска / горячая клавиша */}
        <div className="flex items-center gap-2 shrink-0">
          {!query && (
            <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-1 text-xs font-mono font-medium text-fg-dim bg-surface rounded-md border border-line select-none">
              /
            </kbd>
          )}
          <button
            type="submit"
            aria-label="Искать"
            className="p-2 rounded-xl bg-primary text-primary-fg hover:bg-primary-hover shadow-1 active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
