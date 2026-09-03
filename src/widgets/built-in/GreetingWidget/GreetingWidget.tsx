import React, { useState, useEffect } from 'react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import type { GreetingSettings } from './types';

export const GreetingWidget: React.FC<WidgetProps<GreetingSettings>> = ({ settings }) => {
  const userName = settings?.userName ?? '';
  const showIcon = settings?.showIcon ?? true;
  const fontSize = settings?.fontSize || 'lg';
  const align = settings?.align || 'center';
  const customGreeting = settings?.customGreeting?.trim();
  const motivationalStatus = settings?.motivationalStatus?.trim();
  const glowEffect = settings?.glowEffect !== false;

  const [greeting, setGreeting] = useState<{ text: string; icon: string }>({
    text: 'Добрый день',
    icon: '✨',
  });

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting({ text: 'Доброе утро', icon: '🌅' });
      } else if (hour >= 12 && hour < 18) {
        setGreeting({ text: 'Добрый день', icon: '☀️' });
      } else if (hour >= 18 && hour < 23) {
        setGreeting({ text: 'Добрый вечер', icon: '🌆' });
      } else {
        setGreeting({ text: 'Доброй ночи', icon: '🌙' });
      }
    };

    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  const displayName = userName?.trim() ? `, ${userName.trim()}` : '';
  const mainText = customGreeting
    ? `${customGreeting}${displayName}`
    : `${greeting.text}${displayName}`;

  const fontSizeClass = {
    sm: 'text-sm md:text-base font-normal',
    md: 'text-base md:text-lg font-medium',
    lg: 'text-lg md:text-2xl font-semibold',
    xl: 'text-2xl md:text-3xl font-bold tracking-tight',
  }[fontSize];

  const alignClass = {
    center: 'justify-center text-center items-center',
    left: 'justify-start text-left items-start',
    right: 'justify-end text-right items-end',
  }[align];

  const glowStyle = glowEffect
    ? { textShadow: '0 0 24px rgba(56, 189, 248, 0.35)' }
    : undefined;

  return (
    <div
      role="heading"
      aria-level={2}
      className={cn(
        'flex flex-col h-full w-full p-2 select-none tracking-tight transition-all',
        alignClass,
      )}
    >
      <div className={cn('flex items-center gap-2 text-fg', fontSizeClass)} style={glowStyle}>
        <span>{mainText}</span>
        {showIcon && !customGreeting && (
          <span className="inline-block transform hover:scale-125 transition-transform duration-fast">
            {greeting.icon}
          </span>
        )}
      </div>

      {motivationalStatus && (
        <span className="text-xs font-medium text-fg-dim tracking-wide mt-1">
          {motivationalStatus}
        </span>
      )}
    </div>
  );
};
