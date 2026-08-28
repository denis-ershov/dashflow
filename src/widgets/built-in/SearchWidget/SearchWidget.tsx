import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Youtube, Github, ArrowRight, Sparkles, Code, ChevronDown, X } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import type { SearchEngineId, SearchSettings } from './types';

interface SearchEngineConfig {
  id: SearchEngineId;
  name: string;
  url: string;
  placeholder: string;
  icon: React.ReactNode;
}

const ENGINES: Record<SearchEngineId, SearchEngineConfig> = {
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
    icon: <Youtube className="w-4 h-4 text-danger" />,
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity AI',
    url: 'https://www.perplexity.ai/search?q=',
    placeholder: 'Спросить у AI ассистента...',
    icon: <Sparkles className="w-4 h-4 text-accent" />,
  },
};

const ENGINES_LIST = Object.values(ENGINES);

export const SearchWidget: React.FC<WidgetProps<SearchSettings>> = ({
  settings,
  onUpdateSettings,
}) => {
  const [activeEngine, setActiveEngine] = useState<SearchEngineId>(
    settings?.engine || 'google',
  );
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchStyle = settings?.searchStyle || 'bar';
  const showEngineSelector = settings?.showEngineSelector !== false;
  const openInNewTab = Boolean(settings?.openInNewTab);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings?.engine) {
      setActiveEngine(settings.engine);
    }
  }, [settings?.engine]);

  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  const currentEngine = ENGINES[activeEngine] || ENGINES.google;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Прямой переход если введен URL
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(\/.*)?$/i.test(trimmed)
    ) {
      const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      if (openInNewTab) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
      return;
    }

    const targetUrl = `${currentEngine.url}${encodeURIComponent(trimmed)}`;
    if (openInNewTab) {
      window.open(targetUrl, '_blank');
    } else {
      window.location.href = targetUrl;
    }
  };

  const handleSelectEngine = (engId: SearchEngineId) => {
    setActiveEngine(engId);
    setIsDropdownOpen(false);
    onUpdateSettings?.({ engine: engId });
  };

  // Режим Bar (Hero Capsule Search)
  if (searchStyle === 'bar') {
    return (
      <div className="flex flex-col justify-center h-full w-full p-2 relative select-none">
        <form onSubmit={handleSearch} className="w-full relative flex items-center">
          <div
            className={cn(
              'glass-pill w-full flex items-center p-1.5 transition-all duration-normal border border-line focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
              'min-h-[46px] shadow-2',
            )}
          >
            {/* Селектор поисковика */}
            {showEngineSelector && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-label={`Выбрать поисковую систему (текущая: ${currentEngine.name})`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-surface-hover transition-colors text-xs font-semibold text-fg cursor-pointer"
                >
                  <span className="shrink-0">{currentEngine.icon}</span>
                  <span className="hidden sm:inline-block max-w-[80px] truncate">
                    {currentEngine.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                </button>

                {/* Выпадающее меню выбора */}
                {isDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 z-50 w-52 p-1.5 rounded-2xl shadow-3 border border-line animate-fade-in"
                    style={{ backgroundColor: 'var(--dashflow-surface-elevated, #18181b)' }}
                  >
                    <div className="text-[10px] font-semibold text-fg-dim px-2.5 py-1 uppercase tracking-wider">
                      Поисковая система
                    </div>
                    {ENGINES_LIST.map((eng) => (
                      <button
                        key={eng.id}
                        type="button"
                        onClick={() => handleSelectEngine(eng.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left',
                          activeEngine === eng.id
                            ? 'bg-primary text-primary-fg font-semibold'
                            : 'hover:bg-surface-hover text-fg',
                        )}
                      >
                        <span className="shrink-0">{eng.icon}</span>
                        <span className="truncate">{eng.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Разделитель */}
            {showEngineSelector && <div className="h-5 w-px bg-line mx-1 shrink-0" />}

            {/* Поле ввода */}
            <input
              ref={inputRef}
              type="text"
              aria-label="Строка поиска"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={currentEngine.placeholder}
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-fg placeholder:text-fg-muted font-medium w-full min-w-0"
            />

            {/* Кнопка очистки */}
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Очистить"
                className="p-1 text-fg-muted hover:text-fg rounded-lg transition-colors cursor-pointer mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Кнопка отправки */}
            <button
              type="submit"
              aria-label="Искать"
              disabled={!query.trim()}
              className="p-2 rounded-xl bg-primary text-primary-fg hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer min-w-[34px] min-h-[34px] flex items-center justify-center shadow-1 shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Режим Tiles (Классические кнопки + Поле ввода)
  return (
    <form onSubmit={handleSearch} className="flex flex-col justify-center h-full gap-2 p-2 select-none">
      {showEngineSelector && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {ENGINES_LIST.map((eng) => (
            <button
              key={eng.id}
              type="button"
              onClick={() => handleSelectEngine(eng.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[32px] shrink-0',
                activeEngine === eng.id
                  ? 'bg-primary text-primary-fg shadow-1'
                  : 'bg-surface text-fg-muted hover:text-fg hover:bg-surface-hover border border-line',
              )}
            >
              {eng.icon}
              <span>{eng.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative flex items-center group">
        <div className="absolute left-3 text-primary pointer-events-none transition-transform duration-fast group-focus-within:scale-110">
          <Search className="w-4 h-4" />
        </div>

        <input
          type="text"
          aria-label="Поиск в интернете"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Искать в ${currentEngine.name}...`}
          className="w-full bg-surface text-sm text-fg placeholder:text-fg-muted border border-line rounded-xl pl-10 pr-10 py-2 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 font-medium"
        />

        <button
          type="submit"
          aria-label="Найти"
          disabled={!query.trim()}
          className="absolute right-2 p-2 rounded-lg bg-primary text-primary-fg opacity-0 group-focus-within:opacity-100 disabled:opacity-0 transition-opacity cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
