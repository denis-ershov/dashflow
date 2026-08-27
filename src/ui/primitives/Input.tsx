import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || (label ? generatedId : undefined);
    const errorId = inputId && error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-fg-muted pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className={cn(
              'w-full bg-surface text-fg placeholder:text-fg-muted border border-line rounded-md px-4 py-2 text-sm transition-colors duration-fast focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50 min-h-[44px]',
              icon && 'pl-9',
              error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/20',
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <span id={errorId} className="text-xs text-danger px-1">
            {error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
