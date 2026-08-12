import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}) => {
  return (
    <label
      className={twMerge(
        clsx(
          'inline-flex items-center space-x-3 cursor-pointer select-none',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )
      )}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out border border-[var(--color-border)]',
          checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface)]'
        )}
      >
        <span
          className={clsx(
            'inline-block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out absolute top-0.5 left-0.5',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </div>
      {label && <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>}
    </label>
  );
};
