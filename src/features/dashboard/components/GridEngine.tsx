import React, { useEffect, useState } from 'react';
import RGL, { LayoutItem } from 'react-grid-layout';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetCard } from './WidgetCard';
import { WidgetRegistry } from '@/widgets/core/WidgetRegistry';
import { registerBuiltInWidgets } from '@/widgets/built-in';
import { PluginHost } from '@/widgets/sandbox/PluginHost';
import { WidgetSettingsDrawer } from './WidgetSettingsDrawer';

// Подключение WidthProvider для вычисления ширины сетки
const WidthProvider = (RGL as any).WidthProvider || (RGL as any).default?.WidthProvider;
const ReactGridLayout = WidthProvider ? WidthProvider(RGL) : RGL;

export const GridEngine: React.FC = () => {
  const { columns, gap, widgets, isEditMode, updateLayout } = useDashboardStore();
  const [activeSettingsInstanceId, setActiveSettingsInstanceId] = useState<string | null>(null);

  useEffect(() => {
    registerBuiltInWidgets();
  }, []);

  const layoutItems: LayoutItem[] = widgets.map((w) => ({
    i: w.instanceId,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: 1,
    minH: 1,
  }));

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    const updated = newLayout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
    updateLayout(updated);
  };

  return (
    <>
      <ReactGridLayout
        className="layout w-full"
        layout={layoutItems}
        cols={columns}
        rowHeight={90}
        margin={[gap, gap]}
        containerPadding={[0, 0]}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
      >
        {widgets.map((item) => {
          const definition = WidgetRegistry.get(item.widgetId);
          const Component = definition?.component;

          return (
            <div key={item.instanceId}>
              <WidgetCard
                instanceId={item.instanceId}
                title={definition ? definition.name : item.widgetId.toUpperCase()}
                onOpenSettings={() => setActiveSettingsInstanceId(item.instanceId)}
              >
                {Component ? (
                  <Component instanceId={item.instanceId} settings={item.settings} />
                ) : (
                  <PluginHost pluginId={item.widgetId} instanceId={item.instanceId} />
                )}
              </WidgetCard>
            </div>
          );
        })}
      </ReactGridLayout>

      {/* Панель настроек виджета */}
      <WidgetSettingsDrawer
        instanceId={activeSettingsInstanceId}
        onClose={() => setActiveSettingsInstanceId(null)}
      />
    </>
  );
};
