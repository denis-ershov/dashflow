import React, { useState } from 'react';
import { cn } from '@/ui/lib/cn';
import { Calendar } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import { computePeriodProgress, useNow } from '@/core/datetime';

export interface YearProgressionProps {
  className?: string;
}

type HeroProgressMode = 'year' | 'month' | 'day';

export const YearProgression: React.FC<YearProgressionProps> = ({ className }) => {
  const [viewMode, setViewMode] = useState<HeroProgressMode>('year');
  const { t, formatDate } = useTranslation();
  const now = useNow(60_000);

  const labels: Record<HeroProgressMode, string> = {
    year: t('hero.year', { year: now.getFullYear() }),
    month: formatDate(now, { month: 'long' }),
    day: t('hero.today'),
  };
  const active = { label: labels[viewMode], percent: computePeriodProgress(viewMode, now).percent };

  const handleNextMode = () => {
    if (viewMode === 'year') setViewMode('month');
    else if (viewMode === 'month') setViewMode('day');
    else setViewMode('year');
  };

  return (
    <button
      type="button"
      onClick={handleNextMode}
      aria-label={t('hero.progressLabel', { label: active.label, percent: active.percent })}
      className={cn(
        'glass-pill flex items-center gap-3 px-4 py-2 text-xs select-none cursor-pointer group min-h-11',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-fg-muted group-hover:text-primary transition-colors">
        <Calendar className="w-4 h-4 shrink-0" />
        <span className="font-medium capitalize">{active.label}</span>
      </div>

      <div className="w-20 sm:w-28 h-2 bg-surface rounded-full overflow-hidden border border-line">
        <div
          className="h-full bg-primary rounded-full transition-all duration-normal"
          style={{ width: `${active.percent}%` }}
        />
      </div>

      <span className="font-mono text-fg font-semibold min-w-10 text-right">
        {active.percent}%
      </span>
    </button>
  );
};
