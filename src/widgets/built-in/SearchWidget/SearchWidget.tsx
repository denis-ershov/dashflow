import React, { useState } from 'react';
import { Search, Globe, Youtube, Github, Command, ArrowRight } from 'lucide-react';

export type SearchEngineId = 'google' | 'yandex' | 'duckduckgo' | 'bing' | 'youtube' | 'github';

interface SearchEngineConfig {
  id: SearchEngineId;
  name: string;
  url: string;
  icon: React.ReactNode;
}

const ENGINES: SearchEngineConfig[] = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', icon: <Globe className="w-3.5 h-3.5 text-blue-400" /> },
  { id: 'yandex', name: 'Yandex', url: 'https://yandex.ru/search/?text=', icon: <Globe className="w-3.5 h-3.5 text-red-400" /> },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query=', icon: <Youtube className="w-3.5 h-3.5 text-red-500" /> },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q=', icon: <Github className="w-3.5 h-3.5 text-purple-400" /> },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: <Globe className="w-3.5 h-3.5 text-amber-400" /> },
];

export interface SearchWidgetProps {
  instanceId: string;
  settings?: {
    engine?: SearchEngineId;
  };
}

export const SearchWidget: React.FC<SearchWidgetProps> = ({ settings }) => {
  const [activeEngine, setActiveEngine] = useState<SearchEngineId>(
    settings?.engine || 'google'
  );
  const [query, setQuery] = useState('');

  const currentEngine = ENGINES.find((e) => e.id === activeEngine) || ENGINES[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const targetUrl = `${currentEngine.url}${encodeURIComponent(query.trim())}`;
    window.location.href = targetUrl;
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-col justify-center h-full space-y-2.5">
      {/* Провайдеры поиска (Табы Raycast) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
        {ENGINES.map((eng) => (
          <button
            key={eng.id}
            type="button"
            onClick={() => setActiveEngine(eng.id)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeEngine === eng.id
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {eng.icon}
            <span>{eng.name}</span>
          </button>
        ))}
      </div>

      {/* Поисковая строка Spotlight Pro */}
      <div className="relative flex items-center group">
        <div className="absolute left-3.5 text-[var(--color-primary)] transition-transform duration-150 group-focus-within:scale-110">
          <Search className="w-4 h-4" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Искать в ${currentEngine.name}...`}
          className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] border border-[var(--color-border)] rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all font-medium"
        />

        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 p-1.5 rounded-lg bg-[var(--color-primary)] text-white opacity-0 group-focus-within:opacity-100 disabled:opacity-0 transition-opacity cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
};
