import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import { useTranslation } from '@/core/i18n';
import { computePeriodProgress, useNow, type ProgressPeriod } from '@/core/datetime';
import type { YearProgressSettings } from './types';

export const YearProgressWidget: React.FC<WidgetProps<YearProgressSettings>> = ({
  settings,
  onUpdateSettings,
}) => {
  const [viewMode, setViewMode] = useState<ProgressPeriod>(settings?.defaultMode || 'year');
  const showPercentage = settings?.showPercentage !== false;
  const progressStyle = settings?.progressStyle || 'pill';
  const showRemainingDays = settings?.showRemainingDays !== false;
  const gradient = settings?.gradient || 'cyan-indigo';
  const { t, tp, formatDate } = useTranslation();
  const now = useNow(60_000);

  useEffect(() => {
    if (settings?.defaultMode) {
      setViewMode(settings.defaultMode);
    }
  }, [settings?.defaultMode]);

  const progress = computePeriodProgress(viewMode, now);
  const labels: Record<ProgressPeriod, string> = {
    year: t('yearProgress.year', { year: now.getFullYear() }),
    quarter: t('yearProgress.quarter', { quarter: Math.floor(now.getMonth() / 3) + 1 }),
    month: formatDate(now, { month: 'long' }),
    week: t('yearProgress.week'),
    day: t('yearProgress.today'),
  };
  const current = {
    percent: progress.percent,
    label: labels[viewMode],
    remaining:
      viewMode === 'day'
        ? tp('yearProgress.hoursLeft', progress.remainingHours)
        : tp('yearProgress.daysLeft', progress.remainingDays),
  };

  const cycleMode = () => {
    const modes: ProgressPeriod[] = [
      'year',
      'month',
      'day',
      'quarter',
      'week',
    ];
    const nextIdx = (modes.indexOf(viewMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setViewMode(nextMode);
    onUpdateSettings?.({ defaultMode: nextMode });
  };

  const gradientClass = {
    'cyan-indigo': 'from-[#38BDF8] to-[#818CF8] shadow-[0_0_12px_rgba(56,189,248,0.4)]',
    emerald: 'from-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(52,211,153,0.4)]',
    sunset: 'from-rose-400 to-orange-400 shadow-[0_0_12px_rgba(251,113,133,0.4)]',
    amber: 'from-amber-400 to-yellow-500 shadow-[0_0_12px_rgba(251,191,36,0.4)]',
  }[gradient] || 'from-[#38BDF8] to-[#818CF8]';

  return (
    <button
      type="button"
      role="button"
      aria-label={t('yearProgress.label')}
      onClick={cycleMode}
      className="flex flex-col justify-center h-full w-full p-3 cursor-pointer group select-none transition-all text-left bg-transparent border-0"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-fg tracking-wide capitalize">
          <Calendar className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          <span>{current.label}</span>
          <ArrowRight className="w-3 h-3 text-fg-dim opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex items-center gap-2">
          {showRemainingDays && current.remaining && (
            <span className="text-2xs text-fg-dim font-medium hidden sm:inline-block">
              {current.remaining}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs font-bold font-mono text-fg bg-surface-active/70 px-2 py-0.5 rounded-lg border border-line">
              {current.percent}%
            </span>
          )}
        </div>
      </div>

      {/* Полоса прогресса */}
      <div
        className={cn(
          'w-full bg-surface-active overflow-hidden border border-line/60',
          progressStyle === 'pill' ? 'h-3 rounded-full p-0.5' : 'h-2 rounded-md',
        )}
      >
        <div
          className={cn(
            'h-full bg-linear-to-r rounded-full transition-all duration-700 ease-out',
            gradientClass,
          )}
          style={{ width: `${current.percent}%` }}
        />
      </div>
    </button>
  );
};
