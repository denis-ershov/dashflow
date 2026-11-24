import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/ui/lib/cn';
import { useTranslation } from '@/core/i18n';
import { Search, X, ChevronDown } from 'lucide-react';
import {
  SEARCH_ENGINE_LIST,
  getEngineName,
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

  const { t } = useTranslation();
  const activeEngine = getSearchEngine(engine);
  const activeName = getEngineName(activeEngine, t);

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
          'glass-panel flex items-center gap-2 p-1 pl-2 min-h-12 rounded-md border shadow-1 transition-colors duration-fast max-[380px]:grid max-[380px]:grid-cols-[minmax(0,1fr)_auto]',
          'border-line hover:border-line-hover',
          'focus-within:border-primary',
        )}
      >
        {/* Кнопка выбора поисковика */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-label={t('search.chooseEngine', { name: activeName })}
            className="flex items-center gap-2 px-3 py-2 rounded-sm bg-surface hover:bg-surface-hover text-fg text-xs font-medium border border-line transition-colors min-h-10 cursor-pointer relative before:absolute before:-inset-1 before:content-[''] max-[380px]:h-11 max-[380px]:w-11 max-[380px]:min-w-11 max-[380px]:px-0 max-[380px]:justify-center"
          >
            {activeEngine.icon}
            <span className="hidden sm:inline">{activeName}</span>
            <ChevronDown className="w-4 h-4 text-fg-muted max-[380px]:hidden" />
          </button>

          {/* Выпадающее меню поисковиков */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 z-50 w-48 glass-panel rounded-md shadow-2 border border-line p-1 flex flex-col gap-1">
              {SEARCH_ENGINE_LIST.map((item) => {
                const key = item.id;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectEngine(key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-medium text-left transition-colors cursor-pointer',
                      engine === key
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'text-fg hover:bg-surface-hover',
                    )}
                  >
                    {item.icon}
                    <span>{getEngineName(item, t)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Поле ввода */}
        <div className="relative flex-1 flex min-w-0 items-center max-[380px]:col-span-2 max-[380px]:row-start-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(activeEngine.placeholderKey)}
            aria-label={t('search.input')}
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
              aria-label={t('search.clear')}
              className="text-fg-muted hover:text-fg p-1 rounded-md hover:bg-surface-hover transition-colors relative before:absolute before:-inset-2 before:content-['']"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Кнопка поиска / горячая клавиша */}
        <div className="flex items-center gap-2 shrink-0 max-[380px]:col-start-2 max-[380px]:row-start-1 max-[380px]:justify-self-end">
          {!query && (
            <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-1 text-xs font-mono font-medium text-fg-dim bg-surface rounded-md border border-line select-none">
              /
            </kbd>
          )}
          <button
            type="submit"
            aria-label={t('search.submit')}
            className="p-2 rounded-sm bg-primary text-primary-fg hover:bg-primary-hover transition-colors min-w-10 min-h-10 flex items-center justify-center cursor-pointer relative before:absolute before:-inset-1 before:content-['']"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
