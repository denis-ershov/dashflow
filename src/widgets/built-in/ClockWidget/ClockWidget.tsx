import React, { useState, useEffect } from 'react';

export interface ClockWidgetProps {
  instanceId: string;
  settings?: {
    is24Hour?: boolean;
    showSeconds?: boolean;
  };
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({ settings }) => {
  const is24Hour = settings?.is24Hour ?? true;
  const showSeconds = settings?.showSeconds ?? true;

  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    let hours = time.getHours();
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    let ampm = '';

    if (!is24Hour) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }

    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}:${minutes}${showSeconds ? `:${seconds}` : ''}${ampm}`;
  };

  const formatDate = () => {
    return time.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center select-none">
      <div className="text-4xl sm:text-5xl font-bold font-mono text-[var(--color-primary)] tracking-tight">
        {formatTime()}
      </div>
      <div className="text-xs text-[var(--color-text-muted)] mt-2 font-medium capitalize">
        {formatDate()}
      </div>
    </div>
  );
};
