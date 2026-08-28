import React, { useState, useEffect } from 'react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import type { GreetingSettings } from './types';

export const GreetingWidget: React.FC<WidgetProps<GreetingSettings>> = ({ settings }) => {
  const userName = settings?.userName ?? '';
  const showIcon = settings?.showIcon ?? true;
  const fontSize = settings?.fontSize || 'lg';
  const align = settings?.align || 'center';

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

  const fontSizeClass = {
    sm: 'text-sm md:text-base',
    md: 'text-base md:text-lg',
    lg: 'text-lg md:text-xl font-medium',
    xl: 'text-xl md:text-2xl font-semibold',
  }[fontSize];

  const alignClass = {
    center: 'justify-center text-center items-center',
    left: 'justify-start text-left items-start',
    right: 'justify-end text-right items-end',
  }[align];

  return (
    <div
      role="heading"
      aria-level={2}
      className={cn(
        'flex h-full w-full p-2 select-none tracking-tight text-fg-muted transition-all',
        alignClass,
      )}
    >
      <div className={cn('flex items-center gap-2', fontSizeClass)}>
        <span>
          {greeting.text}
          {displayName}
        </span>
        {showIcon && (
          <span className="text-xl" role="img" aria-hidden="true">
            {greeting.icon}
          </span>
        )}
      </div>
    </div>
  );
};
