import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { Button } from '@/ui/primitives/Button';
import { useFocusTrap } from './useFocusTrap';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, containerRef, onClose);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        data-backdrop="true"
        className="fixed inset-0 bg-canvas/70 backdrop-blur-sm transition-opacity duration-fast animate-fade-in border-none cursor-default"
        onClick={onClose}
      />

      {/* Container */}
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full bg-surface text-fg border border-line rounded-xl shadow-3 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in duration-normal focus-visible:outline-none',
          widthClasses[maxWidth],
          className,
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
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
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
