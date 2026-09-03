import React, { useId } from 'react';
import { cn } from '@/ui/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  'aria-label': ariaLabel,
  disabled = false,
  className,
  id: customId,
}) => {
  const autoId = useId();
  const switchId = customId ?? autoId;

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={switchId}
      className={cn(
        'inline-flex items-center gap-3 select-none min-h-[44px] cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-label={label || ariaLabel}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'relative inline-flex items-center w-11 h-6 shrink-0 rounded-full border border-line transition-colors duration-normal ease-expo cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed',
          checked ? 'bg-primary' : 'bg-surface',
        )}
      >
        <span
          className={cn(
            'inline-block w-4 h-4 rounded-full shadow-1 transition-transform duration-normal ease-expo',
            checked ? 'translate-x-6 bg-primary-fg' : 'translate-x-1 bg-fg',
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-fg">{label}</span>}
    </label>
  );
};
