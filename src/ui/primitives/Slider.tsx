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
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min || 1)) * 100));

  return (
    <div className={cn('flex flex-col gap-2 w-full min-h-[44px] justify-center', className)}>
      {label && (
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-fg">{label}</span>
          <span className="text-primary font-mono text-xs px-2 py-1 rounded-md bg-surface border border-line">
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
        style={{
          background: `linear-gradient(to right, var(--dashflow-primary, #3b82f6) ${percentage}%, var(--dashflow-line, rgba(255, 255, 255, 0.1)) ${percentage}%)`,
        }}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      />
    </div>
  );
};
