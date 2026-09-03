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
  const timezone = settings?.timezone ?? 'local';
  const blinkColon = settings?.blinkColon ?? true;
  const glowEffect = settings?.glowEffect ?? true;
  const dateFormat = settings?.dateFormat ?? 'full';

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

  const getTimeInZone = (date: Date, tz: string): Date => {
    if (!tz || tz === 'local') return date;
    try {
      return new Date(
        date.toLocaleString('en-US', {
          timeZone: tz,
        }),
      );
    } catch {
      return date;
    }
  };

  const activeTime = getTimeInZone(time, timezone);

  useEffect(() => {
    if (showGreeting) {
      const hour = activeTime.getHours();
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
  }, [showGreeting, activeTime]);

  const hoursRaw = activeTime.getHours();
  const hours = !is24Hour
    ? (hoursRaw % 12 || 12).toString().padStart(2, '0')
    : hoursRaw.toString().padStart(2, '0');
  const minutes = activeTime.getMinutes().toString().padStart(2, '0');
  const seconds = activeTime.getSeconds().toString().padStart(2, '0');
  const ampm = !is24Hour ? (hoursRaw >= 12 ? 'PM' : 'AM') : '';

  const formatDate = () => {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US';
    if (dateFormat === 'numeric') {
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
      }).format(activeTime);
    }
    if (dateFormat === 'short') {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(activeTime);
    }
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(activeTime);
  };

  const displayName = userName?.trim() ? `, ${userName.trim()}` : '';
  const glowStyle = glowEffect ? { textShadow: '0 0 24px rgba(56, 189, 248, 0.35)' } : undefined;
  const colonClass = cn('transition-opacity duration-300 font-bold', blinkColon ? 'animate-pulse text-primary' : 'text-primary');

  const renderClockStyle = () => {
    switch (clockStyle) {
      case 'flip':
        return (
          <div className="flex items-center gap-2 sm:gap-3 select-none">
            <div className="relative overflow-hidden glass-panel px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-2 text-center min-w-[55px] sm:min-w-[75px] border border-line/70">
              <div className="absolute inset-x-0 top-1/2 h-px bg-line/80 pointer-events-none" />
              <span className="text-3xl sm:text-5xl font-display font-bold text-fg tracking-tight" style={glowStyle}>
                {hours}
              </span>
            </div>
            <span className={cn('text-2xl sm:text-4xl', colonClass)}>:</span>
            <div className="relative overflow-hidden glass-panel px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-2 text-center min-w-[55px] sm:min-w-[75px] border border-line/70">
              <div className="absolute inset-x-0 top-1/2 h-px bg-line/80 pointer-events-none" />
              <span className="text-3xl sm:text-5xl font-display font-bold text-fg tracking-tight" style={glowStyle}>
                {minutes}
              </span>
            </div>
            {showSeconds && (
              <>
                <span className="text-lg sm:text-2xl text-fg-dim">:</span>
                <div className="relative overflow-hidden glass-subtle px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-center min-w-[38px] sm:min-w-[48px] border border-line/50">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-line/50 pointer-events-none" />
                  <span className="text-xl sm:text-3xl font-mono text-fg-muted">{seconds}</span>
                </div>
              </>
            )}
            {!is24Hour && (
              <div className="glass-subtle px-2 py-1 rounded-lg self-end mb-1 border border-line/50">
                <span className="text-[10px] sm:text-xs font-semibold text-fg-muted">{ampm}</span>
              </div>
            )}
          </div>
        );

      case 'minimal':
        return (
          <div className="flex items-center gap-1 font-light tracking-wide text-fg select-none text-4xl sm:text-5xl md:text-6xl" style={glowStyle}>
            <span>{hours}</span>
            <span className={cn('opacity-70 text-fg-dim', blinkColon && 'animate-pulse')}>:</span>
            <span>{minutes}</span>
            {showSeconds && (
              <span className="text-xl sm:text-2xl font-light text-fg-dim ml-1">:{seconds}</span>
            )}
            {!is24Hour && (
              <span className="text-xs sm:text-sm text-fg-dim ml-2 font-normal">{ampm}</span>
            )}
          </div>
        );

      case 'serif':
        return (
          <div className="flex items-baseline font-serif select-none text-4xl sm:text-6xl md:text-7xl text-fg tracking-tight" style={glowStyle}>
            <span>{hours}</span>
            <span className={cn('mx-1', colonClass)}>:</span>
            <span>{minutes}</span>
            {showSeconds && (
              <span className="text-xl sm:text-3xl font-mono text-fg-dim ml-2 font-normal">
                {seconds}
              </span>
            )}
            {!is24Hour && (
              <span className="text-xs sm:text-sm font-sans uppercase font-medium text-fg-dim ml-2">
                {ampm}
              </span>
            )}
          </div>
        );

      case 'mono':
        return (
          <div className="flex items-center font-mono select-none text-3xl sm:text-5xl md:text-6xl text-fg tracking-wider" style={glowStyle}>
            <span>{hours}</span>
            <span className={cn('mx-0.5', colonClass)}>:</span>
            <span>{minutes}</span>
            {showSeconds && (
              <>
                <span className="text-fg-dim mx-0.5">:</span>
                <span className="text-primary font-medium">{seconds}</span>
              </>
            )}
            {!is24Hour && (
              <span className="text-xs sm:text-sm text-fg-dim ml-2 self-end mb-1">{ampm}</span>
            )}
          </div>
        );

      case 'digital':
      default:
        return (
          <div className="flex items-baseline select-none" style={glowStyle}>
            <span className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-fg tracking-tighter">
              {hours}
            </span>
            <span className={cn('text-3xl sm:text-5xl md:text-6xl mx-1 select-none', colonClass)}>
              :
            </span>
            <span className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-fg tracking-tighter">
              {minutes}
            </span>
            {showSeconds && (
              <span className="text-lg sm:text-2xl font-display font-medium text-fg-dim ml-2">
                {seconds}
              </span>
            )}
            {!is24Hour && (
              <span className="text-xs sm:text-sm font-semibold text-fg-muted uppercase ml-2 tracking-wide self-end mb-2">
                {ampm}
              </span>
            )}
          </div>
        );
    }
  };

  return (
    <div role="timer" aria-label="Часы" className="flex flex-col items-center justify-center h-full w-full p-2">
      {showGreeting && (
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-fg-muted font-medium mb-1 transition-all">
          <span>{greeting.icon}</span>
          <span>
            {greeting.text}
            {displayName}
          </span>
        </div>
      )}

      {renderClockStyle()}

      {showDate && (
        <div className="mt-1.5 text-xs sm:text-sm text-fg-muted capitalize tracking-wide font-medium">
          {formatDate()}
          {timezone && timezone !== 'local' && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-primary border border-line">
              {timezone.split('/')[1]?.replace('_', ' ') || timezone}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
