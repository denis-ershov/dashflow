import React from 'react';
import { cn } from '@/ui/lib/cn';
import { useTranslation } from '@/core/i18n';
import { DAY_PART_ICONS, getDayPart, useNow } from '@/core/datetime';

export interface SmartGreetingProps {
  userName?: string;
  className?: string;
}

export const SmartGreeting: React.FC<SmartGreetingProps> = ({ userName, className }) => {
  const { t } = useTranslation();
  const dayPart = getDayPart(useNow(60_000).getHours());
  const displayName = userName?.trim() ? `, ${userName.trim()}` : '';

  return (
    <div
      role="heading"
      aria-level={2}
      className={cn(
        'text-base md:text-xl font-medium text-fg-muted tracking-tight select-none flex items-center justify-center gap-2',
        className,
      )}
    >
      <span>
        {t(`greeting.${dayPart}`)}
        {displayName}
      </span>
      <span className="text-xl" role="img" aria-hidden="true">
        {DAY_PART_ICONS[dayPart]}
      </span>
    </div>
  );
};
