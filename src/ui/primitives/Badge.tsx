import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-surface text-fg-muted border border-line',
    primary: 'bg-primary/15 text-primary border border-primary/20',
    secondary: 'bg-secondary/15 text-secondary border border-secondary/20',
    success: 'bg-success/15 text-success border border-success/20',
    warning: 'bg-warning/15 text-warning border border-warning/20',
    danger: 'bg-danger/15 text-danger border border-danger/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium select-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
