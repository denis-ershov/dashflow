import React, { useState } from 'react';
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { Columns, Move, Plus, Check, Sliders } from 'lucide-react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetRegistry } from '@/core/widget/registry';
import { WidgetShell } from '@/core/widget/WidgetShell';
import { registerBuiltInWidgets } from '@/widgets/built-in';
import { useTranslation } from '@/core/i18n';
import { LazyWidgetRenderer } from './LazyWidgetRenderer';
import { WidgetSettingsDrawer } from './WidgetSettingsDrawer';
import { useGridMetrics } from '../hooks/useGridMetrics';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { Button } from '@/ui/primitives/Button';
import type { BaseColumns } from '@/core/storage';

// Синхронная гарантированная регистрация встроенных манифестов
registerBuiltInWidgets();

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
    layouts,
    isEditMode,
    setEditMode,
    setBaseColumns,
    setGap,
    updateLayout,
    removeWidget,
    setActiveModal,
  } = useDashboardStore();

  const [activeSettingsInstanceId, setActiveSettingsInstanceId] = useState<string | null>(null);
  const { width, containerRef, mounted } = useContainerWidth();

  const responsiveCols = getResponsiveCols(columns);

  const { rowHeight } = useGridMetrics({
    containerRef: containerRef as React.RefObject<HTMLElement>,
    cols: columns,
    margin: gap,
  });

  const handleLayoutChange = (currentLayout: Layout) => {
    if (!isEditMode) return;
    if (currentLayout && currentLayout.length > 0) {
      const updated = currentLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }));
      updateLayout(updated);
    }
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

  // Расчёт ширины для отрисовки сетки (fallback для первого тика / тестов = 1200)
  const gridWidth = mounted && width > 0 ? width : 1200;

  return (
    <div
      ref={containerRef}
      data-testid="grid-engine-container"
      className="w-full relative"
    >
      {/* Панель редактора сетки в активном режиме редактирования */}
      {isEditMode && (
        <div className="mb-4 p-3 rounded-2xl glass-card border border-warning/40 shadow-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-warning/15 text-warning text-xs font-semibold border border-warning/30">
              <Move className="w-3.5 h-3.5" />
              <span>Редактор сетки</span>
            </div>

            {/* Выбор колонок базовой сетки */}
            <div className="flex items-center gap-1.5 bg-surface/80 p-1 rounded-xl border border-line text-xs">
              <span className="text-fg-muted px-1.5 font-medium flex items-center gap-1">
                <Columns className="w-3.5 h-3.5" /> Колонки:
              </span>
              {([12, 16, 24] as BaseColumns[]).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => setBaseColumns(cols)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    columns === cols
                      ? 'bg-primary text-primary-fg shadow-1'
                      : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
                  }`}
                >
                  {cols}
                </button>
              ))}
            </div>

            {/* Выбор отступа (Gap) */}
            <div className="hidden sm:flex items-center gap-1.5 bg-surface/80 p-1 rounded-xl border border-line text-xs">
              <span className="text-fg-muted px-1.5 font-medium flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" /> Отступ:
              </span>
              {[8, 16, 24].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGap(g)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    gap === g
                      ? 'bg-primary text-primary-fg shadow-1'
                      : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
                  }`}
                >
                  {g}px
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveModal('addWidget')}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить виджет</span>
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setEditMode(false)}
              className="flex items-center gap-1.5 bg-warning text-black hover:bg-warning/90 border-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Завершить</span>
            </Button>
          </div>
        </div>
      )}

      <ResponsiveGridLayout
        width={gridWidth}
        className="layout w-full"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={responsiveCols}
        rowHeight={rowHeight}
        margin={[gap, gap]}
        containerPadding={[0, 0]}
        dragConfig={{
          enabled: isEditMode,
          handle: '.widget-drag-handle',
          threshold: 3,
        }}
        resizeConfig={{
          enabled: isEditMode,
          handles: ['se'],
        }}
        compactor={verticalCompactor}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((item) => {
          const definition = WidgetRegistry.get(item.widgetId);
          const widgetTitle = definition?.nameKey ? t(definition.nameKey) : definition?.name || item.widgetId;

          return (
            <div key={item.instanceId}>
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
                  isEditMode={isEditMode}
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
