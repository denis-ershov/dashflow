import React, { useState, useEffect } from 'react';
import type { WidgetProps } from '@/core/widget';
import { useTranslation } from '@/core/i18n';
import { cn } from '@/ui/lib/cn';
import type { ClockSettings } from './types';

export const ClockWidget: React.FC<WidgetProps<ClockSettings>> = ({ settings }) => {
  const is24Hour = settings?.is24Hour ?? true;
  const showSeconds = settings?.showSeconds ?? false;
  const showDate = settings?.showDate ?? true;
  const clockStyle = settings?.clockStyle || 'digital';
  const showGreeting = settings?.showGreeting ?? false;
  const userName = settings?.userName ?? '';

  const { language } = useTranslation();
  const [time, setTime] = useState<Date>(() => new Date());
  const [greeting, setGreeting] = useState<{ text: string; icon: string }>({
    text: 'Добрый день',
    icon: '☀️',
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showGreeting) {
      const hour = time.getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting({ text: 'Доброе утро', icon: '🌅' });
      } else if (hour >= 12 && hour < 18) {
        setGreeting({ text: 'Добрый день', icon: '☀️' });
      } else if (hour >= 18 && hour < 23) {
        setGreeting({ text: 'Добрый вечер', icon: '🌆' });
      } else {
        setGreeting({ text: 'Доброй ночи', icon: '🌙' });
      }
    }
  }, [showGreeting, time]);

  const hoursRaw = time.getHours();
  const hours = !is24Hour
    ? (hoursRaw % 12 || 12).toString().padStart(2, '0')
    : hoursRaw.toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const ampm = !is24Hour ? (hoursRaw >= 12 ? 'PM' : 'AM') : '';

  const formatDate = () => {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(time);
  };

  const displayName = userName?.trim() ? `, ${userName.trim()}` : '';

  const renderClockStyle = () => {
    switch (clockStyle) {
      case 'flip':
        return (
          <div className="flex items-center gap-2 sm:gap-3 select-none">
            <div className="glass-panel px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-2 text-center min-w-[55px] sm:min-w-[75px]">
              <span className="text-3xl sm:text-5xl font-display font-bold text-fg tracking-tight">
                {hours}
              </span>
            </div>
            <span className="text-2xl sm:text-4xl font-bold text-primary animate-pulse">:</span>
            <div className="glass-panel px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-2 text-center min-w-[55px] sm:min-w-[75px]">
              <span className="text-3xl sm:text-5xl font-display font-bold text-fg tracking-tight">
                {minutes}
              </span>
            </div>
            {showSeconds && (
              <>
                <span className="text-lg sm:text-2xl text-fg-dim">:</span>
                <div className="glass-subtle px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-center min-w-[38px] sm:min-w-[48px]">
                  <span className="text-xl sm:text-3xl font-mono text-fg-muted">{seconds}</span>
                </div>
              </>
            )}
            {!is24Hour && (
              <div className="glass-subtle px-2 py-1 rounded-lg self-end mb-1">
                <span className="text-[10px] sm:text-xs font-semibold text-fg-muted">{ampm}</span>
              </div>
            )}
          </div>
        );

      case 'minimal':
        return (
          <div className="flex items-center gap-1 font-light tracking-wide text-fg select-none text-4xl sm:text-5xl md:text-6xl">
            <span>{hours}</span>
            <span className="text-fg-dim opacity-70">:</span>
            <span>{minutes}</span>
            {!is24Hour && (
              <span className="text-xs sm:text-sm text-fg-dim ml-2 font-normal">{ampm}</span>
            )}
          </div>
        );

      case 'serif':
        return (
          <div className="flex items-baseline gap-1 sm:gap-2 font-serif font-normal tracking-normal text-fg drop-shadow-md select-none text-4xl sm:text-5xl md:text-6xl">
            <span>{hours}</span>
            <span className="text-primary/70">:</span>
            <span>{minutes}</span>
            {showSeconds && (
              <span className="text-lg sm:text-xl text-fg-dim ml-1 italic font-light">
                {seconds}
              </span>
            )}
            {!is24Hour && (
              <span className="text-xs sm:text-sm text-fg-muted ml-2 font-sans italic">{ampm}</span>
            )}
          </div>
        );

      case 'mono':
        return (
          <div className="flex items-baseline gap-1 font-mono font-medium text-fg tracking-wider select-none text-4xl sm:text-5xl md:text-6xl">
            <span>{hours}</span>
            <span className="text-secondary animate-pulse">:</span>
            <span>{minutes}</span>
            {showSeconds && (
              <span className="text-lg sm:text-xl text-fg-muted ml-1 font-light">.{seconds}</span>
            )}
            {!is24Hour && (
              <span className="text-xs text-fg-dim ml-2 uppercase">{ampm}</span>
            )}
          </div>
        );

      case 'digital':
      default:
        return (
          <div className="flex items-baseline gap-1 sm:gap-2 font-display font-semibold tracking-tight text-fg drop-shadow-md select-none text-4xl sm:text-5xl md:text-6xl">
            <span>{hours}</span>
            <span className="text-primary animate-pulse">:</span>
            <span>{minutes}</span>
            {showSeconds && (
              <span className="text-lg sm:text-2xl text-fg-muted font-mono ml-1 font-normal">
                {seconds}
              </span>
            )}
            {!is24Hour && (
              <span className="text-xs sm:text-base text-fg-dim font-sans ml-2 uppercase font-medium">
                {ampm}
              </span>
            )}
          </div>
        );
    }
  };

  return (
    <div
      role="timer"
      aria-label={`Текущее время: ${hours}:${minutes}`}
      className="flex flex-col items-center justify-center h-full text-center select-none p-2 w-full transition-all"
    >
      {showGreeting && (
        <div className="text-xs sm:text-sm font-medium text-fg-muted tracking-tight mb-1 flex items-center gap-1.5">
          <span>
            {greeting.text}
            {displayName}
          </span>
          <span role="img" aria-hidden="true">
            {greeting.icon}
          </span>
        </div>
      )}

      {renderClockStyle()}

      {showDate && (
        <span className="text-xs sm:text-sm text-fg-muted mt-1.5 font-medium capitalize tracking-wide">
          {formatDate()}
        </span>
      )}
    </div>
  );
};
