import React, { useState, useEffect } from 'react';
import type { WidgetProps } from '@/core/widget';
import { useTranslation } from '@/core/i18n';
import type { ClockSettings } from './types';

export const ClockWidget: React.FC<WidgetProps<ClockSettings>> = ({ settings }) => {
  const is24Hour = settings?.is24Hour ?? true;
  const showSeconds = settings?.showSeconds ?? true;
  const showDate = settings?.showDate ?? true;

  const { language } = useTranslation();
  const [time, setTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: !is24Hour,
    }).format(time);
  };

  const formatDate = () => {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(time);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center select-none p-2">
      <time
        dateTime={time.toISOString()}
        className="text-4xl sm:text-5xl font-bold font-mono text-primary tracking-tight"
      >
        {formatTime()}
      </time>
      {showDate && (
        <span className="text-xs text-fg-muted mt-2 font-medium capitalize">
          {formatDate()}
        </span>
      )}
    </div>
  );
};
