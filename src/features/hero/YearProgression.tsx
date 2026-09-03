import React, { useState, useEffect } from 'react';
import { cn } from '@/ui/lib/cn';
import { Calendar } from 'lucide-react';

export interface YearProgressionProps {
  className?: string;
}

export const YearProgression: React.FC<YearProgressionProps> = ({ className }) => {
  const [viewMode, setViewMode] = useState<'year' | 'month' | 'day'>('year');
  const [progress, setProgress] = useState({
    year: { percent: 0, label: 'Год' },
    month: { percent: 0, label: 'Месяц' },
    day: { percent: 0, label: 'День' },
  });

  useEffect(() => {
    const calculateProgress = () => {
      const now = new Date();

      // День
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const dayPercent = Math.min(
        100,
        Math.max(0, ((now.getTime() - startOfDay) / 86400000) * 100),
      );

      // Месяц
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const totalMonthMs = daysInMonth * 86400000;
      const monthPercent = Math.min(
        100,
        Math.max(0, ((now.getTime() - startOfMonth) / totalMonthMs) * 100),
      );

      // Год
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      const isLeap =
        (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) ||
        now.getFullYear() % 400 === 0;
      const totalYearMs = (isLeap ? 366 : 365) * 86400000;
      const yearPercent = Math.min(
        100,
        Math.max(0, ((now.getTime() - startOfYear) / totalYearMs) * 100),
      );

      setProgress({
        year: { percent: Math.round(yearPercent * 10) / 10, label: `Год ${now.getFullYear()}` },
        month: {
          percent: Math.round(monthPercent * 10) / 10,
          label: new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(now),
        },
        day: { percent: Math.round(dayPercent * 10) / 10, label: 'Сегодня' },
      });
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000);
    return () => clearInterval(interval);
  }, []);

  const active = progress[viewMode];

  const handleNextMode = () => {
    if (viewMode === 'year') setViewMode('month');
    else if (viewMode === 'month') setViewMode('day');
    else setViewMode('year');
  };

  return (
    <button
      type="button"
      onClick={handleNextMode}
      aria-label={`Прогресс времени: ${active.label} завершен на ${active.percent}%`}
      className={cn(
        'glass-pill flex items-center gap-3 px-4 py-2 border border-line hover:border-line-hover text-xs select-none transition-all cursor-pointer group min-h-[36px]',
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

      <span className="font-mono text-fg font-semibold min-w-[40px] text-right">
        {active.percent}%
      </span>
    </button>
  );
};
