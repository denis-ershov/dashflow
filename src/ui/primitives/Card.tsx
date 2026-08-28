import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'surface' | 'subtle' | 'outline';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'glass',
      interactive = false,
      padding = 'md',
      children,
      ...props
    },
    ref,
  ) => {
    const variants = {
      glass: 'glass-card',
      surface: 'bg-surface border border-line shadow-1',
      subtle: 'glass-subtle shadow-sm',
      outline: 'bg-transparent border border-line',
    };

    const paddings = {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4 sm:p-5',
      lg: 'p-6 sm:p-7',
    };

    return (
      <div
        ref={ref}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        className={cn(
          'rounded-2xl transition-all duration-fast overflow-hidden',
          variants[variant],
          paddings[padding],
          interactive &&
            'cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
