import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Settings, Trash2, GripVertical } from 'lucide-react';
import { ErrorState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { WidgetSurfaceType } from './types';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
  onRemove?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Изолированная граница ошибок для предотвращения краха всего дашборда при сбое одного виджета
 */
class WidgetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Безопасное логирование без утечки приватных настроек пользователя (Секция 10)
    console.error('[DashFlow:WidgetError]', {
      name: error.name,
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined });
    this.props.onRetry?.();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-surface/50 border border-line rounded-2xl">
          <ErrorState
            title="Ошибка виджета"
            message="Не удалось загрузить виджет"
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export interface WidgetShellProps {
  instanceId: string;
  title?: string;
  surface?: WidgetSurfaceType;
  isEditMode?: boolean;
  onOpenSettings?: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Универсальная оболочка виджета DashFlow 3.0
 * Поддерживает поверхности panel (glass-card), chromeless, tiles и изолированный ErrorBoundary
 */
export const WidgetShell: React.FC<WidgetShellProps> = ({
  instanceId,
  title,
  surface = 'panel',
  isEditMode = false,
  onOpenSettings,
  onRemove,
  children,
  className,
}) => {
  const isChromeless = surface === 'chromeless';
  const isTiles = surface === 'tiles';

  return (
    <div
      data-instance-id={instanceId}
      data-surface={surface}
      className={cn(
        'relative group w-full h-full flex flex-col transition-all duration-normal overflow-hidden',
        // Стили поверхности Glassmorphism
        isChromeless && 'bg-transparent border-transparent',
        !isChromeless && !isTiles && 'glass-card border border-line rounded-2xl shadow-2 hover:shadow-3',
        isTiles && 'glass-subtle border border-line/80 rounded-2xl p-2 shadow-1',
        // Рамка в режиме редактирования
        isEditMode && 'ring-2 ring-primary/60 border-primary/80',
        isChromeless && isEditMode && 'glass-panel border-dashed border-line rounded-2xl',
        className,
      )}
    >
      {/* Шапка виджета (для panel и в режиме редактирования для остальных) */}
      {(!isChromeless || isEditMode) && (
        <div
          className={cn(
            'flex items-center justify-between px-4 py-2 select-none shrink-0',
            !isChromeless && 'border-b border-line/50 bg-surface/30',
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isEditMode && (
              <button
                type="button"
                className="widget-drag-handle flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover cursor-grab active:cursor-grabbing transition-colors"
                aria-label="Перетащить виджет"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            {title && (
              <h3 className="text-xs font-semibold text-fg truncate tracking-wide">
                {title}
              </h3>
            )}
          </div>

          {/* Панель действий в режиме редактирования или по наведению */}
          <div
            className={cn(
              'flex items-center gap-1 shrink-0 transition-opacity',
              isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Настройки виджета"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {isEditMode && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-danger hover:bg-danger/15 transition-colors cursor-pointer"
                aria-label="Удалить виджет"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Тело виджета, защищенное ErrorBoundary */}
      <div className="flex-1 min-h-0 w-full overflow-auto p-1">
        <WidgetErrorBoundary fallbackTitle={title} onRemove={onRemove}>
          {children}
        </WidgetErrorBoundary>
      </div>
    </div>
  );
};
