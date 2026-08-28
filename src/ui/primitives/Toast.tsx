import React from 'react';
import { create } from 'zustand';
import { cn } from '@/ui/lib/cn';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = toast.duration ?? 4000;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (message: string, title?: string) =>
    useToastStore.getState().addToast({ message, title, type: 'success' }),
  error: (message: string, title?: string) =>
    useToastStore.getState().addToast({ message, title, type: 'error' }),
  info: (message: string, title?: string) =>
    useToastStore.getState().addToast({ message, title, type: 'info' }),
  warning: (message: string, title?: string) =>
    useToastStore.getState().addToast({ message, title, type: 'warning' }),
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-success shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-danger shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-warning shrink-0" />,
    info: <Info className="w-5 h-5 text-primary shrink-0" />,
  };

  return (
    <div
      role="region"
      aria-label="Уведомления"
      className="fixed bottom-6 right-6 z-[var(--z-toast,80)] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((item) => {
        const type = item.type || 'info';
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl glass-panel shadow-2 border border-line duration-normal',
            )}
          >
            {icons[type]}
            <div className="flex-1 min-w-0">
              {item.title && (
                <div className="text-sm font-semibold text-fg tracking-tight">
                  {item.title}
                </div>
              )}
              <div className="text-xs text-fg-muted leading-relaxed mt-1">
                {item.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(item.id)}
              aria-label="Закрыть уведомление"
              className="text-fg-muted hover:text-fg p-1 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
