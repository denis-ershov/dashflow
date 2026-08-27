import React, { useEffect, useState, useRef } from 'react';
import RGL, { LayoutItem, Layouts } from 'react-grid-layout';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetRegistry } from '@/core/widget/registry';
import { WidgetShell } from '@/core/widget/WidgetShell';
import { registerBuiltInWidgets } from '@/widgets/built-in';
import { useTranslation } from '@/core/i18n';
import { deriveResponsiveLayouts } from '@/core/storage/dashboardMigrations';
import { LazyWidgetRenderer } from './LazyWidgetRenderer';
import { WidgetSettingsDrawer } from './WidgetSettingsDrawer';
import { useGridMetrics } from '../hooks/useGridMetrics';
import { EmptyState } from '@/ui/feedback/EmptyState';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RGLAny = RGL as any;
const Responsive = RGLAny.Responsive || RGLAny.default?.Responsive || RGL;
const WidthProvider = RGLAny.WidthProvider || RGLAny.default?.WidthProvider;
const ResponsiveGridLayout = WidthProvider ? WidthProvider(Responsive) : Responsive;

const BREAKPOINTS = { xl: 1200, lg: 900, md: 640, sm: 360, xs: 0 };

const getResponsiveCols = (baseCols: number) => {
  if (baseCols === 24) {
    return { xl: 24, lg: 16, md: 8, sm: 4, xs: 2 };
  }
  if (baseCols === 16) {
    return { xl: 16, lg: 12, md: 8, sm: 4, xs: 2 };
  }
  return { xl: 12, lg: 8, md: 6, sm: 4, xs: 2 };
};

export const GridEngine: React.FC = () => {
  const { t } = useTranslation();
  const {
    columns,
    gap,
    widgets,
    isEditMode,
    updateLayout,
    removeWidget,
    setActiveModal,
  } = useDashboardStore();

  const [activeSettingsInstanceId, setActiveSettingsInstanceId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerBuiltInWidgets();
  }, []);

  const responsiveCols = getResponsiveCols(columns);

  const { rowHeight } = useGridMetrics({
    containerRef: containerRef as React.RefObject<HTMLElement>,
    cols: columns,
    margin: gap,
  });

  const responsiveLayouts = deriveResponsiveLayouts(widgets, columns);

  const handleLayoutChange = (currentLayout: LayoutItem[], _allLayouts: Layouts) => {
    if (!isEditMode) return;
    const updated = currentLayout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    updateLayout(updated);
  };

  if (widgets.length === 0) {
    return (
      <div
        data-testid="grid-engine-container"
        className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 select-none"
      >
        <EmptyState
          title="Ваш дашборд пока пуст"
          description="Добавьте виджеты, чтобы настроить удобное рабочее пространство"
          action={{
            label: 'Добавить первый виджет',
            onClick: () => setActiveModal('addWidget'),
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="grid-engine-container"
      className="w-full relative"
    >
      <ResponsiveGridLayout
        className="layout w-full"
        layouts={responsiveLayouts}
        breakpoints={BREAKPOINTS}
        cols={responsiveCols}
        rowHeight={rowHeight}
        margin={[gap, gap]}
        containerPadding={[0, 0]}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
      >
        {widgets.map((item) => {
          const definition = WidgetRegistry.get(item.widgetId);
          // @ts-expect-error key lookup
          const widgetTitle = definition?.nameKey ? t(definition.nameKey) : definition?.name || item.widgetId;

          return (
            <div key={item.instanceId} data-grid={{ x: item.x, y: item.y, w: item.w, h: item.h }}>
              <WidgetShell
                instanceId={item.instanceId}
                title={String(widgetTitle)}
                surface={definition?.surface || 'panel'}
                isEditMode={isEditMode}
                onOpenSettings={() => setActiveSettingsInstanceId(item.instanceId)}
                onRemove={() => removeWidget(item.instanceId)}
              >
                <LazyWidgetRenderer
                  widgetId={item.widgetId}
                  instanceId={item.instanceId}
                  settings={item.settings}
                />
              </WidgetShell>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* Выдвижная панель настроек виджета */}
      <WidgetSettingsDrawer
        instanceId={activeSettingsInstanceId}
        onClose={() => setActiveSettingsInstanceId(null)}
      />
    </div>
  );
};
