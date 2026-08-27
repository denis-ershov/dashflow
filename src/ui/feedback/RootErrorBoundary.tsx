import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from '@/ui/primitives';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';

export interface RootErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Глобальный корневой предохранитель ошибок (Root Error Boundary)
 * Перехватывает критические сбои рендеринга всего приложения,
 * предотвращает показ пустого экрана и обеспечивает безопасное восстановление (ADR-011, Спецификация Секция 6).
 */
export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return {
      hasError: true,
      // Безопасное логирование без конфиденциальных данных
      errorMessage: error?.message || 'Неизвестная ошибка приложения',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // В логах не выводятся пользовательские настройки или приватные токены
    console.error('CRITICAL [RootErrorBoundary]:', error.name, error.message, errorInfo.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleResetLayout = async (): Promise<void> => {
    try {
      await StorageAdapter.remove(STORAGE_KEYS.DASHBOARD);
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen w-full flex items-center justify-center p-6 bg-canvas text-fg"
        >
          <div className="max-w-md w-full p-6 sm:p-8 rounded-xl bg-surface border border-line shadow-lg flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-1">
              <AlertTriangle className="w-7 h-7" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-fg">
                Что-то пошло не так
              </h1>
              <p className="text-sm text-fg-muted leading-relaxed">
                В приложении произошла непредвиденная ошибка. Вы можете перезагрузить страницу или сбросить расположение виджетов до стандартного.
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="w-full p-3 rounded-lg bg-surface-hover/50 border border-line text-left text-xs font-mono text-fg-muted break-all max-h-24 overflow-y-auto">
                {this.state.errorMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full mt-2">
              <Button
                variant="primary"
                className="flex-1 min-h-[44px]"
                onClick={this.handleReload}
                aria-label="Перезагрузить страницу"
              >
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Перезагрузить
              </Button>
              <Button
                variant="secondary"
                className="flex-1 min-h-[44px]"
                onClick={() => {
                  void this.handleResetLayout();
                }}
                aria-label="Сбросить макет на стандартный"
              >
                <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                Сбросить макет
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
