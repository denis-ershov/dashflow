import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { Button } from '@/ui/primitives/Button';
import { useFocusTrap } from './useFocusTrap';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, containerRef, onClose);

  if (!isOpen) return null;

  const drawerContent = (
    <div className="fixed inset-0 z-[var(--z-modal)] overflow-hidden">
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        data-backdrop="true"
        className="fixed inset-0 bg-canvas/70 backdrop-blur-sm transition-opacity duration-fast animate-fade-in border-none cursor-default"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div
          ref={containerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            'w-screen max-w-md bg-canvas text-fg border-l border-line shadow-3 flex flex-col animate-slide-in-right duration-slow focus-visible:outline-none',
            className,
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-line bg-surface/50">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
              {subtitle && <p className="text-xs text-fg-muted mt-1">{subtitle}</p>}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Закрыть"
              className="p-1 h-auto min-h-[44px] min-w-[44px]"
            >
              <X className="w-5 h-5 text-fg-muted hover:text-fg" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(drawerContent, document.body)
    : drawerContent;
};
