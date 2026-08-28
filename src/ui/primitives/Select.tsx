import React from 'react';
import { cn } from '@/ui/lib/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  error?: string;
  variant?: 'default' | 'glass';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      options,
      error,
      id,
      variant = 'default',
      children,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = id || (label ? generatedId : undefined);
    const errorId = selectId && error ? `${selectId}-error` : undefined;

    const variantStyles = {
      default:
        'bg-surface text-fg border border-line rounded-xl px-4 py-2 text-sm transition-colors duration-fast focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
      glass:
        'glass-input text-fg px-4 py-2 text-sm transition-all duration-fast',
    };

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className={cn(
              'w-full min-h-[44px] appearance-none pr-10 cursor-pointer disabled:opacity-50',
              variantStyles[variant],
              error && 'border-danger focus-visible:border-danger',
              className,
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-canvas text-fg py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 text-fg-muted pointer-events-none flex items-center">
            <ChevronDown className="w-4 h-4" />
          </div>
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

Select.displayName = 'Select';
