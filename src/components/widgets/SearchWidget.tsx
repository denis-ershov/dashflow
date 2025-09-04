import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ExternalLink } from 'lucide-react';
import { WidgetConfig } from '../../types/widget';

interface SearchWidgetProps {
  config: WidgetConfig;
}

interface SearchEngine {
  name: string;
  icon: string;
  searchUrl: string;
  suggestionsUrl?: string;
}

const searchEngines: Record<string, SearchEngine> = {
  google: {
    name: 'Google',
    icon: '🌐',
    searchUrl: 'https://www.google.com/search?q=',
    suggestionsUrl: 'https://suggestqueries.google.com/complete/search?client=chrome&q='
  },
  bing: {
    name: 'Bing',
    icon: '🔍',
    searchUrl: 'https://www.bing.com/search?q=',
    suggestionsUrl: 'https://api.bing.com/qsonhs.aspx?type=cb&q='
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    icon: '🦆',
    searchUrl: 'https://duckduckgo.com/?q='
  },
  yandex: {
    name: 'Яндекс',
    icon: '🅰️',
    searchUrl: 'https://yandex.ru/search/?text=',
    suggestionsUrl: 'https://suggest.yandex.ru/suggest-ff.cgi?part='
  }
};

const SearchWidget: React.FC<SearchWidgetProps> = ({ config }) => {
  const { t } = useTranslation(['common', 'widgets']);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState(config.settings?.defaultEngine || 'google');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const currentEngine = searchEngines[selectedEngine];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    const searchUrl = currentEngine.searchUrl + encodeURIComponent(searchQuery.trim());
    
    if (config.settings?.openInNewTab !== false) {
      window.open(searchUrl, '_blank');
    } else {
      window.location.href = searchUrl;
    }

    setQuery('');
    setShowSuggestions(false);
    
    // Сохраняем в историю поиска
    const history = JSON.parse(localStorage.getItem('search-history') || '[]');
    const newHistory = [searchQuery, ...history.filter((item: string) => item !== searchQuery)].slice(0, 10);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  const handleInputChange = async (value: string) => {
    setQuery(value);
    
    if (value.trim().length > 1 && config.settings?.showSuggestions !== false) {
      // Для демонстрации используем простые предложения
      const mockSuggestions = [
        `${value} погода`,
        `${value} новости`,
        `${value} карта`,
        `${value} википедия`,
        `${value} переводчик`
      ].filter(item => item.toLowerCase().includes(value.toLowerCase()));
      
      setSuggestions(mockSuggestions.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      {/* Селектор поисковой системы */}
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-sm text-light-shadow dark:text-dark-light/70">
          {t('widgets:search.searchEngine')}:
        </span>
        <select
          value={selectedEngine}
          onChange={(e) => setSelectedEngine(e.target.value)}
          className="text-sm bg-light-bg dark:bg-dark-bg border border-light-shadow/30 dark:border-dark-accent/30 rounded px-2 py-1 text-light-text dark:text-dark-light focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
        >
          {Object.entries(searchEngines).map(([key, engine]) => (
            <option key={key} value={key}>
              {engine.icon} {engine.name}
            </option>
          ))}
        </select>
      </div>

      {/* Поисковая строка */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder={t('widgets:search.placeholder')}
            className="input-field pr-10"
          />
          <button
            onClick={() => handleSearch()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 rounded transition-colors"
          >
            <Search size={18} className="text-light-accent dark:text-dark-accent" />
          </button>
        </div>

        {/* Предложения поиска */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-shadow border border-light-shadow/20 dark:border-dark-accent/20 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSearch(suggestion)}
                className="w-full px-3 py-2 text-left hover:bg-light-bg dark:hover:bg-dark-bg text-light-text dark:text-dark-light transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="flex-1">{suggestion}</span>
                  <ExternalLink size={14} className="text-light-shadow dark:text-dark-light/50" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* История поиска */}
      <div className="mt-3">
        <div className="text-xs text-light-shadow dark:text-dark-light/70 mb-2">
          Быстрые ссылки:
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            'Gmail',
            'YouTube', 
            'GitHub',
            'Stack Overflow',
            'ChatGPT'
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => handleSearch(item)}
              className="text-xs px-2 py-1 bg-light-accent/10 dark:bg-dark-accent/10 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 text-light-accent dark:text-dark-accent rounded transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchWidget;