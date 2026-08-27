import React, { useState } from 'react';
import { Search, Globe, Youtube, Github, ArrowRight } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import type { SearchEngineId, SearchSettings } from './types';

interface SearchEngineConfig {
  id: SearchEngineId;
  name: string;
  url: string;
  icon: React.ReactNode;
}

const ENGINES: SearchEngineConfig[] = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', icon: <Globe className="w-3.5 h-3.5 text-blue-400" /> },
  { id: 'yandex', name: 'Yandex', url: 'https://yandex.ru/search/?text=', icon: <Globe className="w-3.5 h-3.5 text-red-400" /> },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: <Globe className="w-3.5 h-3.5 text-amber-400" /> },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=', icon: <Globe className="w-3.5 h-3.5 text-cyan-400" /> },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query=', icon: <Youtube className="w-3.5 h-3.5 text-red-500" /> },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q=', icon: <Github className="w-3.5 h-3.5 text-purple-400" /> },
];

export const SearchWidget: React.FC<WidgetProps<SearchSettings>> = ({ settings }) => {
  const [activeEngine, setActiveEngine] = useState<SearchEngineId>(
    settings?.engine || 'google',
  );
  const [query, setQuery] = useState('');

  const currentEngine = ENGINES.find((e) => e.id === activeEngine) || ENGINES[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const targetUrl = `${currentEngine.url}${encodeURIComponent(trimmed)}`;
    window.location.href = targetUrl;
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-col justify-center h-full gap-2.5 p-2">
      {/* Провайдеры поиска */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {ENGINES.map((eng) => (
          <button
            key={eng.id}
            type="button"
            onClick={() => setActiveEngine(eng.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer min-h-[32px]',
              activeEngine === eng.id
                ? 'bg-primary text-primary-fg shadow-sm'
                : 'bg-surface text-fg-muted hover:text-fg hover:bg-surface-hover border border-line',
            )}
          >
            {eng.icon}
            <span>{eng.name}</span>
          </button>
        ))}
      </div>

      {/* Поисковая строка */}
      <div className="relative flex items-center group">
        <div className="absolute left-3.5 text-primary pointer-events-none transition-transform duration-fast group-focus-within:scale-110">
          <Search className="w-4 h-4" />
        </div>

        <input
          type="text"
          aria-label="Поиск в интернете"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Искать в ${currentEngine.name}...`}
          className="w-full bg-surface text-sm text-fg placeholder:text-fg-muted border border-line rounded-lg pl-10 pr-10 py-2.5 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 font-medium"
        />

        <button
          type="submit"
          aria-label="Найти"
          disabled={!query.trim()}
          className="absolute right-2 p-2 rounded-md bg-primary text-primary-fg opacity-0 group-focus-within:opacity-100 disabled:opacity-0 transition-opacity cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
};
