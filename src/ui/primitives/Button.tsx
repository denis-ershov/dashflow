import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-all duration-normal ease-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';

    const variants = {
      primary:
        'bg-primary text-primary-fg hover:bg-primary-hover shadow-1 hover:shadow-2',
      secondary:
        'bg-surface text-fg border border-line hover:bg-surface-hover hover:border-line-hover',
      ghost:
        'text-fg hover:bg-surface-hover hover:text-primary',
      danger:
        'bg-danger text-primary-fg hover:opacity-90 shadow-1',
      glass:
        'bg-glass backdrop-blur-md text-fg border border-glass-line hover:border-line-hover hover:bg-surface-hover',
    };

    const sizes = {
      sm: 'px-3 py-2 text-xs gap-2 min-h-[44px]',
      md: 'px-4 py-2 text-sm gap-2 min-h-[44px]',
      lg: 'px-6 py-3 text-base gap-3 min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
