import React from 'react';
import { cn } from '@/ui/lib/cn';
import { useTranslation } from '@/core/i18n';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label, className, ...props }) => {
  const { t } = useTranslation();
  label ??= t('feedback.loading');
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      role="status"
      className={cn(
        'inline-block rounded-full border-solid border-primary border-t-transparent animate-spin',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
};
