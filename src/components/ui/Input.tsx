import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-[var(--color-text-muted)] pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-50 min-h-[44px]',
                icon && 'pl-10',
                error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                className
              )
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-500 px-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
