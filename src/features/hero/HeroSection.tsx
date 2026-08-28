import React from 'react';
import { cn } from '@/ui/lib/cn';
import { HeroClock } from './HeroClock';
import { SmartGreeting } from './SmartGreeting';
import { SearchBar2, type SearchEngineKey } from './SearchBar2';
import { YearProgression } from './YearProgression';
import type { HeroSettings } from '@/core/storage';

export interface HeroSectionProps {
  settings?: HeroSettings;
  onEngineChange?: (engine: SearchEngineKey) => void;
  className?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  settings,
  onEngineChange,
  className,
}) => {
  const clockStyle = settings?.clockStyle ?? 'digital';
  const timeFormat = settings?.timeFormat ?? '24h';
  const showSeconds = settings?.showSeconds ?? false;
  const showDate = settings?.showDate ?? true;
  const showGreeting = settings?.showGreeting ?? true;
  const userName = settings?.userName ?? '';
  const showYearProgress = settings?.showYearProgress ?? true;
  const showSearchBar = settings?.showSearchBar ?? true;
  const defaultEngine = (settings?.defaultSearchEngine as SearchEngineKey) ?? 'google';

  return (
    <header
      className={cn(
        'w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-6 py-6 px-4 transition-all duration-normal text-center',
        className,
      )}
    >
      {/* Приветствие */}
      {showGreeting && <SmartGreeting userName={userName} />}

      {/* Часы */}
      <HeroClock
        style={clockStyle}
        timeFormat={timeFormat}
        showSeconds={showSeconds}
        showDate={showDate}
        className="my-2"
      />

      {/* Поисковая строка */}
      {showSearchBar && (
        <SearchBar2
          defaultEngine={defaultEngine}
          onEngineChange={onEngineChange}
          className="mt-2"
        />
      )}

      {/* Индикатор прогресса года/дня */}
      {showYearProgress && (
        <div className="flex items-center justify-center mt-1">
          <YearProgression />
        </div>
      )}
    </header>
  );
};
