import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/ui/lib/cn';
import { Search, X, ChevronDown } from 'lucide-react';
import {
  SEARCH_ENGINE_LIST,
  getSearchEngine,
  openSearchTarget,
  resolveSearchTarget,
  useSlashHotkey,
  type SearchEngineId,
} from '@/core/search';

/** Псевдоним для настроек Hero: тот же набор поисковиков, что и у виджета «Поиск» */
export type SearchEngineKey = SearchEngineId;

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

  const activeEngine = getSearchEngine(engine);

  // Синхронизация движка при изменении настроек в SettingsModal
  useEffect(() => {
    if (defaultEngine) {
      setEngine(defaultEngine);
    }
  }, [defaultEngine]);

  useSlashHotkey(inputRef);

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
    const target = resolveSearchTarget(query, activeEngine);
    if (target) openSearchTarget(target, false);
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
        className={cn(
          'glass-panel flex items-center gap-2 p-1.5 pl-2 min-h-13 rounded-full border shadow-2 transition-all duration-normal',
          'border-line hover:border-line-hover',
          'focus-within:border-primary focus-within:shadow-[0_0_24px_var(--dashflow-primary-glow)]',
        )}
      >
        {/* Кнопка выбора поисковика */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-label={`Выбрать поисковую систему (текущая: ${activeEngine.name})`}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-surface hover:bg-surface-hover text-fg text-xs font-medium border border-line transition-colors min-h-10 cursor-pointer relative before:absolute before:-inset-1 before:content-['']"
          >
            {activeEngine.icon}
            <span className="hidden sm:inline">{activeEngine.name}</span>
            <ChevronDown className="w-4 h-4 text-fg-muted" />
          </button>

          {/* Выпадающее меню поисковиков */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 z-50 w-48 glass-panel rounded-xl shadow-3 border border-line p-2 flex flex-col gap-1">
              {SEARCH_ENGINE_LIST.map((item) => {
                const key = item.id;
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
            className={cn(
              'w-full bg-transparent text-sm px-2 py-2 focus:outline-none min-h-9',
              'text-fg',
              'placeholder:text-fg-muted',
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
              className="text-fg-muted hover:text-fg p-1 rounded-md hover:bg-surface-hover transition-colors relative before:absolute before:-inset-2 before:content-['']"
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
            className="p-2 rounded-full bg-primary text-primary-fg hover:bg-primary-hover shadow-1 active:scale-95 transition-all min-w-10 min-h-10 flex items-center justify-center cursor-pointer relative before:absolute before:-inset-1 before:content-['']"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
