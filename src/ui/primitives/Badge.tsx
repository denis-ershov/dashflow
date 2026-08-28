import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'glass';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  dot = false,
  className,
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-surface text-fg-muted border border-line',
    primary: 'bg-primary/15 text-primary border border-primary/30 shadow-1',
    secondary: 'bg-secondary/15 text-secondary border border-secondary/30',
    success: 'bg-success/15 text-success border border-success/30',
    warning: 'bg-warning/15 text-warning border border-warning/30',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    glass: 'glass-pill text-fg border-line',
  };

  const dotColors = {
    default: 'bg-fg-dim',
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    glass: 'bg-primary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide select-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('w-2 h-2 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
