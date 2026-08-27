import type { WidgetInstance } from '@/core/widget/types';

export type Breakpoint = 'xl' | 'lg' | 'md' | 'sm' | 'xs';
export type BaseColumns = 12 | 16 | 24;

export const BREAKPOINTS: Record<Breakpoint, number> = {
  xl: 1200,
  lg: 900,
  md: 640,
  sm: 360,
  xs: 0,
};

export const BREAKPOINT_COLUMNS: Record<BaseColumns, Record<Breakpoint, number>> = {
  12: { xl: 12, lg: 8, md: 6, sm: 4, xs: 2 },
  16: { xl: 16, lg: 12, md: 8, sm: 4, xs: 2 },
  24: { xl: 24, lg: 16, md: 8, sm: 4, xs: 2 },
};

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export type ResponsiveLayouts = Record<Breakpoint, LayoutItem[]>;

export interface MigratedDashboardState {
  version: 2;
  baseColumns: BaseColumns;
  gap: number;
  isEditMode: boolean;
  isLocked: boolean;
  activeModal: string | null;
  instances: WidgetInstance[];
  layouts: ResponsiveLayouts;
}

const DEFAULT_INSTANCES: WidgetInstance[] = [
  { instanceId: 'clock-1', widgetId: 'clock', settings: {} },
  { instanceId: 'weather-1', widgetId: 'weather', settings: {} },
  { instanceId: 'search-1', widgetId: 'search', settings: {} },
  { instanceId: 'rss-1', widgetId: 'rssReader', settings: {} },
  { instanceId: 'bookmarks-1', widgetId: 'bookmarks', settings: {} },
];

const DEFAULT_BASE_LAYOUT: LayoutItem[] = [
  { i: 'clock-1', x: 0, y: 0, w: 4, h: 2 },
  { i: 'weather-1', x: 4, y: 0, w: 4, h: 2 },
  { i: 'search-1', x: 8, y: 0, w: 4, h: 2 },
  { i: 'rss-1', x: 0, y: 2, w: 6, h: 4 },
  { i: 'bookmarks-1', x: 6, y: 2, w: 6, h: 4 },
];

/**
 * Автоматически рассчитывает адаптивные раскладки для всех брейкпоинтов из базовой раскладки
 */
export function deriveResponsiveLayouts(
  baseLayout: LayoutItem[],
  baseCols: BaseColumns = 12,
): ResponsiveLayouts {
  const colMap = BREAKPOINT_COLUMNS[baseCols] || BREAKPOINT_COLUMNS[12];

  const createLayoutForCols = (cols: number): LayoutItem[] => {
    let currentY = 0;
    let currentX = 0;
    let rowMaxH = 0;

    return baseLayout.map((item) => {
      const w = Math.min(item.w, cols);
      const h = item.h;

      if (currentX + w > cols) {
        currentX = 0;
        currentY += rowMaxH;
        rowMaxH = 0;
      }

      const layoutItem: LayoutItem = {
        i: item.i,
        x: currentX,
        y: currentY,
        w,
        h,
        minW: item.minW ? Math.min(item.minW, cols) : undefined,
        minH: item.minH,
        maxW: item.maxW ? Math.min(item.maxW, cols) : undefined,
        maxH: item.maxH,
      };

      currentX += w;
      rowMaxH = Math.max(rowMaxH, h);

      return layoutItem;
    });
  };

  return {
    xl: baseLayout.map((item) => ({ ...item })),
    lg: createLayoutForCols(colMap.lg),
    md: createLayoutForCols(colMap.md),
    sm: createLayoutForCols(colMap.sm),
    xs: createLayoutForCols(colMap.xs),
  };
}

/**
 * Создает дефолтное состояние дашборда версии 2
 */
export function createDefaultDashboardState(): MigratedDashboardState {
  return {
    version: 2,
    baseColumns: 12,
    gap: 16,
    isEditMode: false,
    isLocked: false,
    activeModal: null,
    instances: [...DEFAULT_INSTANCES],
    layouts: deriveResponsiveLayouts(DEFAULT_BASE_LAYOUT, 12),
  };
}

/**
 * Чистая функция миграции состояния Dashboard Store v1 -> v2 (Правило 24, 25, 51)
 */
export function migrateDashboardState(rawState: unknown): MigratedDashboardState {
  if (!rawState || typeof rawState !== 'object') {
    return createDefaultDashboardState();
  }

  const rawObj = rawState as Record<string, unknown>;

  // Если состояние уже v2 с валидными instances и layouts
  if (rawObj.version === 2 && Array.isArray(rawObj.instances) && rawObj.layouts) {
    const rawLayouts = rawObj.layouts as Record<string, unknown>;
    if (Array.isArray(rawLayouts.xl)) {
      return {
        version: 2,
        baseColumns: (rawObj.baseColumns as BaseColumns) || 12,
        gap: typeof rawObj.gap === 'number' ? rawObj.gap : 16,
        isEditMode: Boolean(rawObj.isEditMode),
        isLocked: Boolean(rawObj.isLocked),
        activeModal: typeof rawObj.activeModal === 'string' ? rawObj.activeModal : null,
        instances: rawObj.instances as WidgetInstance[],
        layouts: rawObj.layouts as ResponsiveLayouts,
      };
    }
  }

  // Миграция из v1 (содержащего rawObj.widgets с x, y, w, h)
  if (Array.isArray(rawObj.widgets)) {
    const rawWidgets = rawObj.widgets as Array<Record<string, unknown>>;
    const instances: WidgetInstance[] = [];
    const baseLayout: LayoutItem[] = [];

    for (const w of rawWidgets) {
      if (!w || typeof w !== 'object') continue;
      const instanceId = typeof w.instanceId === 'string' ? w.instanceId : `widget-${Date.now()}-${Math.random()}`;
      const widgetId = typeof w.widgetId === 'string' ? w.widgetId : 'unknown';
      const settings = (w.settings && typeof w.settings === 'object' ? w.settings : {}) as Record<
        string,
        unknown
      >;

      instances.push({
        instanceId,
        widgetId,
        settings,
      });

      baseLayout.push({
        i: instanceId,
        x: typeof w.x === 'number' ? w.x : 0,
        y: typeof w.y === 'number' ? w.y : 0,
        w: typeof w.w === 'number' ? w.w : 4,
        h: typeof w.h === 'number' ? w.h : 2,
      });
    }

    const baseCols: BaseColumns =
      rawObj.columns === 16 || rawObj.columns === 24 ? rawObj.columns : 12;
    const gap = typeof rawObj.gap === 'number' ? rawObj.gap : 16;

    return {
      version: 2,
      baseColumns: baseCols,
      gap,
      isEditMode: false,
      isLocked: Boolean(rawObj.isLocked),
      activeModal: null,
      instances: instances.length > 0 ? instances : DEFAULT_INSTANCES,
      layouts: deriveResponsiveLayouts(baseLayout.length > 0 ? baseLayout : DEFAULT_BASE_LAYOUT, baseCols),
    };
  }

  return createDefaultDashboardState();
}
