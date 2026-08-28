import React, { useState, useEffect } from 'react';
import { cn } from '@/ui/lib/cn';

export interface HeroClockProps {
  style?: 'digital' | 'minimal' | 'serif' | 'flip' | 'mono';
  timeFormat?: '12h' | '24h';
  showSeconds?: boolean;
  showDate?: boolean;
  className?: string;
}

export const HeroClock: React.FC<HeroClockProps> = ({
  style = 'digital',
  timeFormat = '24h',
  showSeconds = false,
  showDate = true,
  className,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hoursRaw = now.getHours();
  const hours =
    timeFormat === '12h'
      ? (hoursRaw % 12 || 12).toString().padStart(2, '0')
      : hoursRaw.toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm = timeFormat === '12h' ? (hoursRaw >= 12 ? 'PM' : 'AM') : '';

  // Форматирование даты на русском языке (Правило 1)
  const dateFormatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  const styleVariants = {
    digital: (
      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-2 font-display font-semibold tracking-tight text-fg drop-shadow-md select-none text-6xl md:text-7xl lg:text-8xl">
          <span>{hours}</span>
          <span className="text-primary animate-pulse">:</span>
          <span>{minutes}</span>
          {showSeconds && (
            <span className="text-2xl md:text-3xl text-fg-muted font-mono ml-1 font-normal">
              {seconds}
            </span>
          )}
          {timeFormat === '12h' && (
            <span className="text-lg md:text-xl text-fg-dim font-sans ml-2 uppercase font-medium">
              {ampm}
            </span>
          )}
        </div>
      </div>
    ),
    minimal: (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 font-light tracking-wide text-fg select-none text-5xl md:text-6xl lg:text-7xl">
          <span>{hours}</span>
          <span className="text-fg-dim opacity-70">:</span>
          <span>{minutes}</span>
          {timeFormat === '12h' && (
            <span className="text-sm text-fg-dim ml-2 font-normal">{ampm}</span>
          )}
        </div>
      </div>
    ),
    serif: (
      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-2 font-serif font-normal tracking-normal text-fg drop-shadow-md select-none text-6xl md:text-7xl lg:text-8xl">
          <span>{hours}</span>
          <span className="text-primary/70">:</span>
          <span>{minutes}</span>
          {showSeconds && (
            <span className="text-xl md:text-2xl text-fg-dim ml-1 italic font-light">
              {seconds}
            </span>
          )}
          {timeFormat === '12h' && (
            <span className="text-base text-fg-muted ml-2 font-sans italic">{ampm}</span>
          )}
        </div>
      </div>
    ),
    flip: (
      <div className="flex items-center gap-3 select-none">
        <div className="glass-panel px-4 py-3 rounded-2xl shadow-2 text-center min-w-[70px] md:min-w-[90px]">
          <span className="text-4xl md:text-6xl font-display font-bold text-fg tracking-tight">
            {hours}
          </span>
        </div>
        <span className="text-3xl md:text-5xl font-bold text-primary animate-pulse">:</span>
        <div className="glass-panel px-4 py-3 rounded-2xl shadow-2 text-center min-w-[70px] md:min-w-[90px]">
          <span className="text-4xl md:text-6xl font-display font-bold text-fg tracking-tight">
            {minutes}
          </span>
        </div>
        {showSeconds && (
          <>
            <span className="text-xl md:text-3xl text-fg-dim">:</span>
            <div className="glass-subtle px-3 py-2 rounded-xl text-center min-w-[45px] md:min-w-[60px]">
              <span className="text-2xl md:text-4xl font-mono text-fg-muted">{seconds}</span>
            </div>
          </>
        )}
        {timeFormat === '12h' && (
          <div className="glass-subtle px-2 py-1 rounded-lg self-end mb-2">
            <span className="text-xs font-semibold text-fg-muted">{ampm}</span>
          </div>
        )}
      </div>
    ),
    mono: (
      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-2 font-mono font-medium text-fg tracking-wider select-none text-5xl md:text-6xl lg:text-7xl">
          <span>{hours}</span>
          <span className="text-secondary">:</span>
          <span>{minutes}</span>
          {showSeconds && (
            <span className="text-2xl text-fg-muted ml-2 font-light">.{seconds}</span>
          )}
          {timeFormat === '12h' && (
            <span className="text-sm text-fg-dim ml-2 uppercase">{ampm}</span>
          )}
        </div>
      </div>
    ),
  };

  return (
    <div
      role="timer"
      aria-label={`Текущее время: ${hours}:${minutes}`}
      className={cn('flex flex-col items-center justify-center text-center transition-all', className)}
    >
      {styleVariants[style] || styleVariants.digital}
      {showDate && (
        <div className="mt-2 text-sm md:text-base font-medium text-fg-muted capitalize tracking-wide select-none">
          {dateFormatted}
        </div>
      )}
    </div>
  );
};
