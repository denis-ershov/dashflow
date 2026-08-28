import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] select-none cursor-pointer';

    const variants = {
      primary:
        'bg-primary text-primary-fg hover:bg-primary-hover shadow-1 hover:shadow-2 border border-primary/20',
      secondary:
        'bg-surface text-fg border border-line hover:bg-surface-hover hover:border-line-hover shadow-sm',
      ghost:
        'text-fg hover:bg-surface-hover hover:text-primary active:bg-surface-active',
      danger:
        'bg-danger text-primary-fg hover:opacity-90 shadow-1 border border-danger/20',
      glass:
        'glass-pill text-fg border border-line hover:border-line-hover hover:bg-surface-hover shadow-sm',
      outline:
        'bg-transparent text-fg border border-line hover:border-primary hover:text-primary hover:bg-primary/5',
      subtle:
        'bg-surface text-fg hover:bg-surface-hover border border-transparent hover:border-line',
    };

    const sizes = {
      sm: 'px-3 py-2 text-xs gap-2 min-h-[44px]',
      md: 'px-4 py-2 text-sm gap-2 min-h-[44px]',
      lg: 'px-6 py-3 text-base gap-3 min-h-[48px]',
      icon: 'w-11 h-11 p-2 min-w-[44px] min-h-[44px] rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0 flex items-center">{icon}</span>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
