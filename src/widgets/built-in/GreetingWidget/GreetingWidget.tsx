import React from 'react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import { useTranslation } from '@/core/i18n';
import { DAY_PART_ICONS, getDayPart, useNow } from '@/core/datetime';
import type { GreetingSettings } from './types';

export const GreetingWidget: React.FC<WidgetProps<GreetingSettings>> = ({ settings }) => {
  const userName = settings?.userName ?? '';
  const showIcon = settings?.showIcon ?? true;
  const fontSize = settings?.fontSize || 'lg';
  const align = settings?.align || 'center';
  const customGreeting = settings?.customGreeting?.trim();
  const motivationalStatus = settings?.motivationalStatus?.trim();
  const glowEffect = settings?.glowEffect !== false;

  const { t } = useTranslation();
  const dayPart = getDayPart(useNow(60_000).getHours());
  const greeting = { text: t(`greeting.${dayPart}`), icon: DAY_PART_ICONS[dayPart] };

  const displayName = userName?.trim() ? `, ${userName.trim()}` : '';
  const mainText = customGreeting
    ? `${customGreeting}${displayName}`
    : `${greeting.text}${displayName}`;

  const fontSizeClass = {
    sm: 'text-sm md:text-base font-normal',
    md: 'text-base md:text-xl font-medium',
    lg: 'text-xl md:text-2xl font-semibold',
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
