import React, { useState, useEffect } from 'react';
import { cn } from '@/ui/lib/cn';

export interface SmartGreetingProps {
  userName?: string;
  className?: string;
}

export const SmartGreeting: React.FC<SmartGreetingProps> = ({ userName, className }) => {
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

  return (
    <div
      role="heading"
      aria-level={2}
      className={cn(
        'text-lg md:text-xl font-medium text-fg-muted tracking-tight select-none flex items-center justify-center gap-2',
        className,
      )}
    >
      <span>
        {greeting.text}
        {displayName}
      </span>
      <span className="text-xl" role="img" aria-hidden="true">
        {greeting.icon}
      </span>
    </div>
  );
};
