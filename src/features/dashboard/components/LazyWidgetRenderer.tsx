import React, { useState, useEffect } from 'react';
import { WidgetRegistry } from '@/core/widget/registry';
import type { WidgetProps } from '@/core/widget/types';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Skeleton } from '@/ui/feedback/Skeleton';
import { ErrorState } from '@/ui/feedback/ErrorState';
import { useTranslation, type TranslationKey } from '@/core/i18n';

/** Причина сбоя хранится ключом, а не текстом: сообщение переводится при отрисовке */
interface LoadError {
  key: TranslationKey;
  params?: Record<string, string>;
}

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
  const { t } = useTranslation();
  const updateWidgetSettings = useDashboardStore((s) => s.updateWidgetSettings);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Component, setComponent] = useState<React.ComponentType<WidgetProps<any>> | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const definition = WidgetRegistry.get(widgetId);
    if (!definition) {
      setError({ key: 'widgetShell.notFound', params: { id: widgetId } });
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
        .catch(() => {
          if (isMounted) {
            setError({ key: 'widgetShell.moduleFailed' });
            setLoading(false);
          }
        });
    } else {
      setError({ key: 'widgetShell.noLoader' });
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
          title={t('widgetShell.loadFailedTitle')}
          message={error ? t(error.key, error.params) : t('widgetShell.unavailable')}
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
