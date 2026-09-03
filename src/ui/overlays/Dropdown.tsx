import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/ui/lib/cn';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const triggerElement = React.isValidElement(trigger) ? (
    React.cloneElement(trigger as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: (e: React.MouseEvent) => {
        (trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
        setIsOpen((prev) => !prev);
      },
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen,
    })
  ) : (
    <button
      type="button"
      onClick={() => setIsOpen((prev) => !prev)}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      className="inline-flex items-center cursor-pointer"
    >
      {trigger}
    </button>
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {triggerElement}

      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute mt-2 w-48 rounded-md bg-surface border border-line shadow-2 z-[var(--z-overlay)] py-1 overflow-hidden animate-fade-in duration-fast',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              type="button"
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center px-4 py-3 text-xs font-medium transition-colors duration-fast text-left cursor-pointer min-h-[44px]',
                item.danger ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-surface-hover',
              )}
            >
              {item.icon && <span className="mr-3 shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
