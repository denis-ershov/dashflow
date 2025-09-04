import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WidgetConfig } from '../../types/widget';

interface ClockWidgetProps {
  config: WidgetConfig;
}

const ClockWidget: React.FC<ClockWidgetProps> = ({ config }) => {
  const { t, i18n } = useTranslation(['common', 'widgets']);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, config.settings?.showSeconds ? 1000 : 60000);

    return () => clearInterval(interval);
  }, [config.settings?.showSeconds]);

  const formatTime = (date: Date) => {
    const format = config.settings?.format || '24h';
    const showSeconds = config.settings?.showSeconds ?? true;
    
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: format === '12h',
      timeZone: config.settings?.timezone || 'Europe/Moscow'
    };

    if (showSeconds) {
      options.second = '2-digit';
    }

    return date.toLocaleTimeString(i18n.language, options);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: config.settings?.timezone || 'Europe/Moscow'
    });
  };

  const renderDigitalClock = () => (
    <div className="text-center">
      <div className="text-4xl font-mono font-bold text-light-text dark:text-dark-light mb-2">
        {formatTime(time)}
      </div>
      {config.settings?.showDate !== false && (
        <div className="text-sm text-light-shadow dark:text-dark-light/70">
          {formatDate(time)}
        </div>
      )}
    </div>
  );

  const renderAnalogClock = () => {
    const secondAngle = (time.getSeconds() * 6) - 90;
    const minuteAngle = (time.getMinutes() * 6) - 90;
    const hourAngle = ((time.getHours() % 12) * 30) + (time.getMinutes() * 0.5) - 90;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4">
          {/* Циферблат */}
          <svg 
            className="w-full h-full" 
            viewBox="0 0 100 100"
          >
            {/* Внешний круг */}
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-light-shadow dark:text-dark-accent/50"
            />
            
            {/* Часовые метки */}
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30) - 90;
              const x1 = 50 + 40 * Math.cos(angle * Math.PI / 180);
              const y1 = 50 + 40 * Math.sin(angle * Math.PI / 180);
              const x2 = 50 + 35 * Math.cos(angle * Math.PI / 180);
              const y2 = 50 + 35 * Math.sin(angle * Math.PI / 180);
              
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth={i % 3 === 0 ? "2" : "1"}
                  className="text-light-text dark:text-dark-light"
                />
              );
            })}
            
            {/* Часовая стрелка */}
            <line
              x1="50"
              y1="50"
              x2={50 + 25 * Math.cos(hourAngle * Math.PI / 180)}
              y2={50 + 25 * Math.sin(hourAngle * Math.PI / 180)}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="text-light-text dark:text-dark-light"
            />
            
            {/* Минутная стрелка */}
            <line
              x1="50"
              y1="50"
              x2={50 + 35 * Math.cos(minuteAngle * Math.PI / 180)}
              y2={50 + 35 * Math.sin(minuteAngle * Math.PI / 180)}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-light-accent dark:text-dark-accent"
            />
            
            {/* Секундная стрелка */}
            {config.settings?.showSeconds !== false && (
              <line
                x1="50"
                y1="50"
                x2={50 + 38 * Math.cos(secondAngle * Math.PI / 180)}
                y2={50 + 38 * Math.sin(secondAngle * Math.PI / 180)}
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                className="text-red-500"
              />
            )}
            
            {/* Центр */}
            <circle
              cx="50"
              cy="50"
              r="3"
              fill="currentColor"
              className="text-light-text dark:text-dark-light"
            />
          </svg>
        </div>
        
        {config.settings?.showDate !== false && (
          <div className="text-sm text-light-shadow dark:text-dark-light/70 text-center">
            {formatDate(time)}
          </div>
        )}
      </div>
    );
  };

  const clockType = config.settings?.clockType || 'digital';

  return (
    <div className="flex items-center justify-center min-h-[120px]">
      {clockType === 'digital' ? renderDigitalClock() : renderAnalogClock()}
    </div>
  );
};

export default ClockWidget;