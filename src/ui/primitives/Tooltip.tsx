import React, { useState } from 'react';
import { cn } from '@/ui/lib/cn';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);
  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);

  return (
    <div
      role="presentation"
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-[var(--z-overlay)] px-3 py-1 text-xs font-medium text-fg bg-surface border border-line rounded-lg shadow-2 whitespace-nowrap pointer-events-none duration-fast',
            positionClasses[position],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
