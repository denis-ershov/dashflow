import React, { useState, useEffect } from 'react';
import { WidgetRegistry } from '@/core/widget/registry';
import type { WidgetProps } from '@/core/widget/types';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Skeleton } from '@/ui/feedback/Skeleton';
import { ErrorState } from '@/ui/feedback/ErrorState';

export interface LazyWidgetRendererProps {
  widgetId: string;
  instanceId: string;
  settings?: Record<string, unknown>;
  isEditMode?: boolean;
}

export const LazyWidgetRenderer: React.FC<LazyWidgetRendererProps> = ({
  widgetId,
  instanceId,
  settings,
  isEditMode = false,
}) => {
  const { updateWidgetSettings } = useDashboardStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Component, setComponent] = useState<React.ComponentType<WidgetProps<any>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const definition = WidgetRegistry.get(widgetId);
    if (!definition) {
      setError(`Виджет "${widgetId}" не найден в реестре`);
      setLoading(false);
      return;
    }

    if (definition.load) {
      definition
        .load()
        .then((module) => {
          if (isMounted) {
            setComponent(() => module.default);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            const message = err instanceof Error ? err.message : 'Ошибка загрузки модуля';
            setError(message);
            setLoading(false);
          }
        });
    } else {
      setError('Манифест виджета не содержит функции загрузки');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [widgetId]);

  if (loading) {
    return (
      <div className="p-3 w-full h-full flex flex-col justify-center gap-2">
        <Skeleton className="w-2/3 h-4 rounded" />
        <Skeleton className="w-full h-10 rounded" />
      </div>
    );
  }

  if (error || !Component) {
    return (
      <div className="p-3 w-full h-full flex items-center justify-center">
        <ErrorState
          title="Сбой загрузки"
          message={error || 'Компонент недоступен'}
        />
      </div>
    );
  }

  return (
    <Component
      instanceId={instanceId}
      settings={settings}
      isEditMode={isEditMode}
      onUpdateSettings={(newSettings: Record<string, unknown>) =>
        updateWidgetSettings(instanceId, newSettings)
      }
    />
  );
};
