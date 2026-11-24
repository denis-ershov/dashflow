import { activeSpaceOf } from '@/core/storage';
import React, { lazy, Suspense, useCallback, useState } from 'react';
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { Columns, Move, Plus, Check, Sliders } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { deleteDashboardEntity } from '@/features/commands/deleteDashboardEntity';
import { WidgetRegistry } from '@/core/widget/registry';
import { WidgetShell } from '@/core/widget/WidgetShell';
import { registerBuiltInWidgets } from '@/widgets/built-in';
import { useTranslation } from '@/core/i18n';
import { LazyWidgetRenderer } from './LazyWidgetRenderer';
import { useGridMetrics } from '../hooks/useGridMetrics';

const WidgetSettingsDrawer = lazy(() =>
  import('./WidgetSettingsDrawer').then(({ WidgetSettingsDrawer }) => ({
    default: WidgetSettingsDrawer,
  })),
);
import { useGridKeyboardNav, applyKeyboardDelta } from '../hooks/useGridKeyboardNav';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { Button } from '@/ui/primitives/Button';
import type { BaseColumns, Breakpoint } from '@/core/storage';

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
    baseColumns,
    gap,
    instances,
    layouts,
    isEditMode,
    setEditMode,
    setBaseColumns,
    setGap,
    updateLayout,
    activeModal,
    setActiveModal,
    activeSpaceId,
    isCommandPaletteOpen,
  } = useDashboardStore(
    useShallow((s) => ({
      baseColumns: activeSpaceOf(s).baseColumns,
      gap: activeSpaceOf(s).gap,
      instances: activeSpaceOf(s).instances,
      layouts: activeSpaceOf(s).layouts,
      isEditMode: s.isEditMode,
      setEditMode: s.setEditMode,
      setBaseColumns: s.setBaseColumns,
      setGap: s.setGap,
      updateLayout: s.updateLayout,
      activeModal: s.activeModal,
      setActiveModal: s.setActiveModal,
      activeSpaceId: s.activeSpaceId,
      isCommandPaletteOpen: s.isCommandPaletteOpen,
    })),
  );

  const [activeSettingsInstanceId, setActiveSettingsInstanceId] = useState<string | null>(null);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('xl');
  const [focusedInstanceId, setFocusedInstanceId] = useState<string | null>(null);
  const { width, containerRef, mounted } = useContainerWidth();

  const responsiveCols = getResponsiveCols(baseColumns);

  const { rowHeight } = useGridMetrics({
    containerRef: containerRef as React.RefObject<HTMLElement>,
    cols: baseColumns,
    margin: gap,
  });

  const applyDelta = useCallback(
    (instanceId: string, dx: number, dy: number, mode: 'move' | 'resize') => {
      const items = layouts[currentBreakpoint];
      const target = items.find((item) => item.i === instanceId);
      if (!target) return;
      const widgetId = instances.find((w) => w.instanceId === instanceId)?.widgetId;
      const size = widgetId ? WidgetRegistry.get(widgetId)?.size : undefined;
      const next = applyKeyboardDelta(
        target,
        dx,
        dy,
        mode,
        responsiveCols[currentBreakpoint],
        size?.minW,
        size?.minH,
      );
      updateLayout(
        currentBreakpoint,
        items.map((item) => (item.i === instanceId ? next : item)),
      );
    },
    [layouts, currentBreakpoint, instances, responsiveCols, updateLayout],
  );

  const { liveAnnouncement } = useGridKeyboardNav({
    // Пока открыта модалка или панель настроек, Escape и стрелки принадлежат им
    enabled: isEditMode && activeModal === null && activeSettingsInstanceId === null && !isCommandPaletteOpen,
    selectedInstanceId: focusedInstanceId,
    onExitEditMode: () => setEditMode(false),
    onMoveWidget: (id, dx, dy) => applyDelta(id, dx, dy, 'move'),
    onResizeWidget: (id, dx, dy) => applyDelta(id, dx, dy, 'resize'),
  });

  const saveGridEdit = (currentLayout: Layout) => {
    if (!isEditMode || useDashboardStore.getState().activeSpaceId !== activeSpaceId) return;
    if (currentLayout && currentLayout.length > 0) {
      const updated = currentLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }));
      updateLayout(currentBreakpoint, updated);
    }
  };

  if (instances.length === 0) {
    return (
      <div
        data-testid="grid-engine-container"
        className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 select-none"
      >
        <EmptyState
          title={t('grid.emptyTitle')}
          description={t('grid.emptyDescription')}
          action={{
            label: t('grid.emptyAction'),
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
        <div className="mb-4 p-3 rounded-lg glass-card border border-warning/40 shadow-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-warning/15 text-warning text-xs font-semibold border border-warning/30">
              <Move className="w-3.5 h-3.5" />
              <span>{t('grid.editorTitle')}</span>
            </div>

            {/* Выбор колонок базовой сетки */}
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 bg-surface/80 p-1 rounded-xl border border-line text-xs">
              <span className="text-fg-muted px-1.5 font-medium flex items-center gap-1">
                <Columns className="w-3.5 h-3.5" /> {t('grid.columns')}
              </span>
              {([12, 16, 24] as BaseColumns[]).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => setBaseColumns(cols)}
                  className={`min-h-11 min-w-11 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    baseColumns === cols
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
                <Sliders className="w-3.5 h-3.5" /> {t('grid.gap')}
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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveModal('addWidget')}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('grid.addWidget')}</span>
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setEditMode(false)}
              className="flex items-center gap-1.5 bg-warning text-black hover:bg-warning/90 border-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('grid.finish')}</span>
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
        onBreakpointChange={(bp) => setCurrentBreakpoint(bp as Breakpoint)}
        onDragStop={saveGridEdit}
        onResizeStop={saveGridEdit}
      >
        {instances.map((item) => {
          const definition = WidgetRegistry.get(item.widgetId);
          const customTitle =
            typeof item.settings?.folderTitle === 'string' && item.settings.folderTitle.trim()
              ? item.settings.folderTitle.trim()
              : undefined;
          const widgetTitle =
            customTitle ??
            (definition?.nameKey ? t(definition.nameKey) : definition?.name || item.widgetId);

          return (
            <div
              key={item.instanceId}
              role="group"
              tabIndex={isEditMode ? 0 : -1}
              aria-label={String(widgetTitle)}
              data-search-widget={item.instanceId}
              onFocus={() => setFocusedInstanceId(item.instanceId)}
              className="focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-xl"
            >
              <WidgetShell
                instanceId={item.instanceId}
                title={String(widgetTitle)}
                surface={definition?.surface || 'panel'}
                isEditMode={isEditMode}
                onOpenSettings={() => setActiveSettingsInstanceId(item.instanceId)}
                onRemove={() => deleteDashboardEntity('widget.delete', item.instanceId, activeSpaceId)}
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

      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Выдвижная панель настроек виджета */}
      {activeSettingsInstanceId && (
        <Suspense fallback={null}>
          <WidgetSettingsDrawer
            instanceId={activeSettingsInstanceId}
            onClose={() => setActiveSettingsInstanceId(null)}
          />
        </Suspense>
      )}
    </div>
  );
};
