import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  variant?: 'default' | 'glass';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, rightElement, error, id, variant = 'default', ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || (label ? generatedId : undefined);
    const errorId = inputId && error ? `${inputId}-error` : undefined;

    const variantStyles = {
      default:
        'bg-surface text-fg placeholder:text-fg-muted border border-line rounded-xl px-4 py-2 text-sm transition-colors duration-fast focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
      glass:
        'glass-input text-fg placeholder:text-fg-muted/70 px-4 py-2 text-sm transition-all duration-fast',
    };

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-fg-muted uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-fg-muted pointer-events-none shrink-0 flex items-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className={cn(
              'w-full min-h-[44px] disabled:opacity-50',
              variantStyles[variant],
              icon && 'pl-10',
              rightElement && 'pr-11',
              error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/20',
              className,
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 text-fg-muted flex items-center">{rightElement}</div>
          )}
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
