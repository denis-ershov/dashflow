import React from 'react';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
}) => {
  return (
    <div className="flex flex-col space-y-2 w-full">
      {label && (
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-[var(--color-text)]">{label}</span>
          <span className="text-[var(--color-secondary)] font-mono">
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
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[var(--color-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] border border-[var(--color-border)] focus:outline-none"
      />
    </div>
  );
};
