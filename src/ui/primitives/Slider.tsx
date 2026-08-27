import React from 'react';
import { cn } from '@/ui/lib/cn';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
  className?: string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
  className,
  disabled = false,
}) => {
  return (
    <div className={cn('flex flex-col gap-2 w-full min-h-[44px] justify-center', className)}>
      {label && (
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-fg">{label}</span>
          <span className="text-secondary font-mono text-xs">
            {value}
            {unit}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-surface rounded-md appearance-none cursor-pointer accent-primary border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
};
