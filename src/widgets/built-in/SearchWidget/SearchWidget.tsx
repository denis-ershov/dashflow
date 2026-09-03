import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Globe, Youtube, Github, ArrowRight, Sparkles, Code, ChevronDown, X, Check } from 'lucide-react';
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
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/?q=',
    placeholder: 'Спросить у ChatGPT...',
    icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
  },
  claude: {
    id: 'claude',
    name: 'Claude AI',
    url: 'https://claude.ai/new?q=',
    placeholder: 'Спросить у Claude AI...',
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
  },
  brave: {
    id: 'brave',
    name: 'Brave Search',
    url: 'https://search.brave.com/search?q=',
    placeholder: 'Искать в Brave Search...',
    icon: <Globe className="w-4 h-4 text-orange-400" />,
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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const searchStyle = settings?.searchStyle || 'bar';
  const showEngineSelector = settings?.showEngineSelector !== false;
  const openInNewTab = Boolean(settings?.openInNewTab);
  const showHotkeyBadge = settings?.showHotkeyBadge !== false;
  const customPlaceholder = settings?.placeholder?.trim();

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings?.autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [settings?.autoFocus]);

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

  useEffect(() => {
    if (settings?.engine) {
      setActiveEngine(settings.engine);
    }
  }, [settings?.engine]);

  // Вычисление координат для портального меню
  const updateDropdownPos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
      });
    }
  }, []);

  const toggleDropdown = () => {
    if (!isDropdownOpen) {
      updateDropdownPos();
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  };

  // Закрытие выпадающего списка при клике вне компонента, скролле или Escape
  useEffect(() => {
    if (!isDropdownOpen) return;

    updateDropdownPos();

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      updateDropdownPos();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isDropdownOpen, updateDropdownPos]);

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
              <div className="relative">
                <button
                  ref={buttonRef}
                  type="button"
                  onClick={toggleDropdown}
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                  aria-label={`Выбрать поисковую систему (текущая: ${currentEngine.name})`}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs font-semibold text-fg cursor-pointer',
                    isDropdownOpen ? 'bg-surface-hover text-primary' : 'hover:bg-surface-hover',
                  )}
                >
                  <span className="shrink-0">{currentEngine.icon}</span>
                  <span className="hidden sm:inline-block max-w-[80px] truncate">
                    {currentEngine.name}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-fg-muted shrink-0 transition-transform duration-fast',
                      isDropdownOpen && 'rotate-180 text-primary',
                    )}
                  />
                </button>

                {/* Выпадающее меню выбора через Portal без ограничений overflow/скролла */}
                {isDropdownOpen &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      ref={dropdownMenuRef}
                      className="fixed z-[99999] w-56 p-1.5 rounded-2xl shadow-3 border border-line animate-fade-in backdrop-blur-xl"
                      style={{
                        top: `${dropdownPos.top}px`,
                        left: `${dropdownPos.left}px`,
                        backgroundColor: 'var(--dashflow-surface-elevated, rgba(24, 24, 27, 0.96))',
                      }}
                      role="menu"
                      aria-label="Поисковая система"
                    >
                      <div className="text-[10px] font-semibold text-fg-dim px-2.5 py-1 uppercase tracking-wider select-none">
                        Поисковая система
                      </div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {ENGINES_LIST.map((eng) => {
                          const isSelected = activeEngine === eng.id;
                          return (
                            <button
                              key={eng.id}
                              type="button"
                              role="menuitem"
                              onClick={() => handleSelectEngine(eng.id)}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left',
                                isSelected
                                  ? 'bg-primary text-primary-fg font-semibold shadow-1'
                                  : 'hover:bg-surface-hover text-fg',
                              )}
                            >
                              <span className="shrink-0">{eng.icon}</span>
                              <span className="truncate flex-1">{eng.name}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 shrink-0 opacity-90 stroke-[2.5]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>,
                    document.body,
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
              placeholder={customPlaceholder || currentEngine.placeholder}
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-fg placeholder:text-fg-muted font-medium w-full min-w-0"
            />

            {/* Подсказка горячей клавиши */}
            {!query.trim() && showHotkeyBadge && (
              <kbd className="hidden sm:inline-flex items-center justify-center h-5 min-w-[20px] px-1 mr-1 text-[10px] font-mono text-fg-muted bg-surface-elevated/80 border border-line rounded-md shadow-xs select-none pointer-events-none">
                /
              </kbd>
            )}

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
