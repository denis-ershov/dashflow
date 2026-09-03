import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import type { YearProgressSettings } from './types';

export const YearProgressWidget: React.FC<WidgetProps<YearProgressSettings>> = ({
  settings,
  onUpdateSettings,
}) => {
  const [viewMode, setViewMode] = useState<'year' | 'quarter' | 'month' | 'week' | 'day'>(
    settings?.defaultMode || 'year',
  );
  const showPercentage = settings?.showPercentage !== false;
  const progressStyle = settings?.progressStyle || 'pill';
  const showRemainingDays = settings?.showRemainingDays !== false;
  const gradient = settings?.gradient || 'cyan-indigo';

  const [progress, setProgress] = useState({
    year: { percent: 0, label: 'Год', remaining: '' },
    quarter: { percent: 0, label: 'Квартал', remaining: '' },
    month: { percent: 0, label: 'Месяц', remaining: '' },
    week: { percent: 0, label: 'Неделя', remaining: '' },
    day: { percent: 0, label: 'День', remaining: '' },
  });

  useEffect(() => {
    if (settings?.defaultMode) {
      setViewMode(settings.defaultMode);
    }
  }, [settings?.defaultMode]);

  useEffect(() => {
    const calculateProgress = () => {
      const now = new Date();

      // День
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const passedDayMs = now.getTime() - startOfDay;
      const dayPercent = Math.min(100, Math.max(0, (passedDayMs / 86400000) * 100));
      const hoursLeft = Math.max(0, 24 - Math.floor(passedDayMs / 3600000));

      // Неделя (Пн - Вс)
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek - 1)).getTime();
      const passedWeekMs = now.getTime() - startOfWeek;
      const weekPercent = Math.min(100, Math.max(0, (passedWeekMs / (7 * 86400000)) * 100));
      const daysLeftInWeek = Math.max(0, 7 - dayOfWeek);

      // Месяц
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const passedMonthMs = now.getTime() - startOfMonth;
      const monthPercent = Math.min(100, Math.max(0, (passedMonthMs / (daysInMonth * 86400000)) * 100));
      const daysLeftInMonth = Math.max(0, daysInMonth - now.getDate());

      // Квартал
      const quarterIdx = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarterIdx * 3, 1).getTime();
      const endOfQuarter = new Date(now.getFullYear(), (quarterIdx + 1) * 3, 0).getTime() + 86400000;
      const totalQuarterMs = endOfQuarter - startOfQuarter;
      const passedQuarterMs = now.getTime() - startOfQuarter;
      const quarterPercent = Math.min(100, Math.max(0, (passedQuarterMs / totalQuarterMs) * 100));
      const daysLeftInQuarter = Math.max(0, Math.ceil((endOfQuarter - now.getTime()) / 86400000));

      // Год
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      const isLeap =
        (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) ||
        now.getFullYear() % 400 === 0;
      const totalYearDays = isLeap ? 366 : 365;
      const totalYearMs = totalYearDays * 86400000;
      const passedYearMs = now.getTime() - startOfYear;
      const yearPercent = Math.min(100, Math.max(0, (passedYearMs / totalYearMs) * 100));
      const daysLeftInYear = Math.max(0, totalYearDays - Math.floor(passedYearMs / 86400000));

      setProgress({
        year: {
          percent: Math.round(yearPercent * 10) / 10,
          label: `${now.getFullYear()} год`,
          remaining: `осталось ${daysLeftInYear} дн.`,
        },
        quarter: {
          percent: Math.round(quarterPercent * 10) / 10,
          label: `${quarterIdx + 1} квартал`,
          remaining: `осталось ${daysLeftInQuarter} дн.`,
        },
        month: {
          percent: Math.round(monthPercent * 10) / 10,
          label: new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(now),
          remaining: `осталось ${daysLeftInMonth} дн.`,
        },
        week: {
          percent: Math.round(weekPercent * 10) / 10,
          label: 'Текущая неделя',
          remaining: `осталось ${daysLeftInWeek} дн.`,
        },
        day: {
          percent: Math.round(dayPercent * 10) / 10,
          label: 'Сегодня',
          remaining: `осталось ${hoursLeft} ч.`,
        },
      });
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000);
    return () => clearInterval(interval);
  }, []);

  const current = progress[viewMode] || progress.year;

  const cycleMode = () => {
    const modes: Array<'year' | 'month' | 'day' | 'quarter' | 'week'> = [
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
      aria-label="Прогресс времени"
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
            <span className="text-[10px] text-fg-dim font-medium hidden sm:inline-block">
              {current.remaining}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs font-bold font-mono text-fg bg-surface-elevated/70 px-2 py-0.5 rounded-lg border border-line">
              {current.percent}%
            </span>
          )}
        </div>
      </div>

      {/* Полоса прогресса */}
      <div
        className={cn(
          'w-full bg-surface-elevated overflow-hidden border border-line/60',
          progressStyle === 'pill' ? 'h-3 rounded-full p-0.5' : 'h-2 rounded-md',
        )}
      >
        <div
          className={cn(
            'h-full bg-gradient-to-r rounded-full transition-all duration-700 ease-out',
            gradientClass,
          )}
          style={{ width: `${current.percent}%` }}
        />
      </div>
    </button>
  );
};
