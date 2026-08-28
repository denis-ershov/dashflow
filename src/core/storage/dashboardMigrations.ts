import type { WidgetInstance } from '@/core/widget/types';

export type Breakpoint = 'xl' | 'lg' | 'md' | 'sm' | 'xs';
export type BaseColumns = 12 | 16 | 24;

export type ActiveModal =
  | 'add'
  | 'addWidget'
  | 'settings'
  | 'themes'
  | 'appearance'
  | 'marketplace'
  | 'importExport'
  | null;

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

export interface HeroSettings {
  clockStyle: 'digital' | 'minimal' | 'serif' | 'flip' | 'mono';
  timeFormat: '12h' | '24h';
  showSeconds: boolean;
  showDate: boolean;
  showClock?: boolean;
  showGreeting: boolean;
  userName: string;
  showYearProgress: boolean;
  showSearchBar: boolean;
  showSpeedDial?: boolean;
  alignment?: 'left' | 'center' | 'right';
  defaultSearchEngine: 'google' | 'yandex' | 'duckduckgo' | 'bing' | 'github' | 'youtube' | 'perplexity';
}

export interface SpeedDialLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export interface MigratedDashboardState {
  version: 2;
  baseColumns: BaseColumns;
  gap: number;
  isEditMode: boolean;
  isLocked: boolean;
  layoutMode: 'zen' | 'modular' | 'canvas';
  heroSettings: HeroSettings;
  speedDialLinks: SpeedDialLink[];
  activeModal: ActiveModal;
  instances: WidgetInstance[];
  layouts: ResponsiveLayouts;
}

export const DEFAULT_HERO_SETTINGS: HeroSettings = {
  clockStyle: 'digital',
  timeFormat: '24h',
  showSeconds: false,
  showDate: true,
  showClock: true,
  showGreeting: true,
  userName: '',
  showYearProgress: true,
  showSearchBar: true,
  showSpeedDial: true,
  alignment: 'center',
  defaultSearchEngine: 'google',
};

export const DEFAULT_SPEED_DIAL_LINKS: SpeedDialLink[] = [
  { id: 'sd-1', title: 'Google', url: 'https://google.com' },
  { id: 'sd-2', title: 'GitHub', url: 'https://github.com' },
  { id: 'sd-3', title: 'YouTube', url: 'https://youtube.com' },
  { id: 'sd-4', title: 'Perplexity', url: 'https://perplexity.ai' },
  { id: 'sd-5', title: 'ChatGPT', url: 'https://chatgpt.com' },
  { id: 'sd-6', title: 'Reddit', url: 'https://reddit.com' },
];

const DEFAULT_INSTANCES: WidgetInstance[] = [
  { instanceId: 'weather-1', widgetId: 'weather', settings: {} },
  { instanceId: 'todo-1', widgetId: 'todo', settings: {} },
  { instanceId: 'notes-1', widgetId: 'notes', settings: {} },
  { instanceId: 'pomodoro-1', widgetId: 'pomodoro', settings: {} },
  { instanceId: 'bookmarks-1', widgetId: 'bookmarks', settings: {} },
];

const DEFAULT_BASE_LAYOUT: LayoutItem[] = [
  { i: 'weather-1', x: 0, y: 0, w: 4, h: 2 },
  { i: 'todo-1', x: 4, y: 0, w: 4, h: 4 },
  { i: 'notes-1', x: 8, y: 0, w: 4, h: 4 },
  { i: 'pomodoro-1', x: 0, y: 2, w: 4, h: 2 },
  { i: 'bookmarks-1', x: 0, y: 4, w: 12, h: 3 },
];

/**
 * Проверяет, пересекаются ли два прямоугольника на сетке
 */
export function isRectangleColliding(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h
  );
}

/**
 * Находит первую свободную позицию (x, y) на сетке заданного числа колонок для виджета размером (w, h)
 */
export function findFirstAvailablePosition(
  existingLayout: LayoutItem[],
  cols: number = 12,
  w: number = 4,
  h: number = 3,
): { x: number; y: number } {
  const clampedW = Math.min(Math.max(1, w), cols);
  const clampedH = Math.max(1, h);
  let y = 0;

  // Ограничитель поиска строк (предотвращение бесконечного цикла)
  while (y < 1000) {
    for (let x = 0; x <= cols - clampedW; x++) {
      const candidate = { x, y, w: clampedW, h: clampedH };
      const hasCollision = existingLayout.some((item) => isRectangleColliding(candidate, item));

      if (!hasCollision) {
        return { x, y };
      }
    }
    y++;
  }

  return { x: 0, y };
}

/**
 * Устраняет любые наложения (коллизии) между элементами раскладки,
 * вытесняя перекрывающиеся элементы вниз (vertical compaction & collision resolution)
 */
export function resolveLayoutCollisions(
  layout: LayoutItem[],
  cols: number = 12,
): LayoutItem[] {
  const resolved: LayoutItem[] = [];

  for (const item of layout) {
    const w = Math.min(Math.max(1, item.w || 4), cols);
    const h = Math.max(1, item.h || 2);
    const x = Math.min(Math.max(0, item.x ?? 0), cols - w);
    let y = Math.max(0, item.y ?? 0);

    // Пока текущая позиция (x, y, w, h) перекрывает любой уже размещенный элемент, смещаем y вниз
    while (
      resolved.some((placed) => isRectangleColliding({ x, y, w, h }, placed))
    ) {
      y++;
    }

    resolved.push({
      ...item,
      x,
      y,
      w,
      h,
    });
  }

  return resolved;
}

/**
 * Автоматически рассчитывает адаптивные раскладки для всех брейкпоинтов из базовой раскладки
 */
export function deriveResponsiveLayouts(
  baseLayout: LayoutItem[],
  baseCols: BaseColumns = 12,
): ResponsiveLayouts {
  const colMap = BREAKPOINT_COLUMNS[baseCols] || BREAKPOINT_COLUMNS[12];
  const cleanBaseLayout = resolveLayoutCollisions(baseLayout, baseCols);

  const createLayoutForCols = (cols: number): LayoutItem[] => {
    let currentY = 0;
    let currentX = 0;
    let rowMaxH = 0;

    const raw = cleanBaseLayout.map((item) => {
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

    return resolveLayoutCollisions(raw, cols);
  };

  return {
    xl: cleanBaseLayout,
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
    layoutMode: 'modular',
    heroSettings: { ...DEFAULT_HERO_SETTINGS },
    speedDialLinks: [...DEFAULT_SPEED_DIAL_LINKS],
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
      const baseCols: BaseColumns =
        rawObj.baseColumns === 16 || rawObj.baseColumns === 24 ? rawObj.baseColumns : 12;
      const sanitizedLayouts = deriveResponsiveLayouts(
        rawLayouts.xl as LayoutItem[],
        baseCols,
      );

      const layoutMode =
        rawObj.layoutMode === 'zen'
          ? 'zen'
          : rawObj.layoutMode === 'canvas'
            ? 'canvas'
            : 'modular';
      const heroSettings =
        rawObj.heroSettings && typeof rawObj.heroSettings === 'object'
          ? { ...DEFAULT_HERO_SETTINGS, ...(rawObj.heroSettings as Partial<HeroSettings>) }
          : { ...DEFAULT_HERO_SETTINGS };
      const speedDialLinks = Array.isArray(rawObj.speedDialLinks)
        ? (rawObj.speedDialLinks as SpeedDialLink[])
        : [...DEFAULT_SPEED_DIAL_LINKS];

      return {
        version: 2,
        baseColumns: baseCols,
        gap: typeof rawObj.gap === 'number' ? rawObj.gap : 16,
        isEditMode: Boolean(rawObj.isEditMode),
        isLocked: Boolean(rawObj.isLocked),
        layoutMode,
        heroSettings,
        speedDialLinks,
        activeModal: typeof rawObj.activeModal === 'string' ? (rawObj.activeModal as ActiveModal) : null,
        instances: rawObj.instances as WidgetInstance[],
        layouts: sanitizedLayouts,
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
      layoutMode: 'modular',
      heroSettings: { ...DEFAULT_HERO_SETTINGS },
      speedDialLinks: [...DEFAULT_SPEED_DIAL_LINKS],
      activeModal: null,
      instances: instances.length > 0 ? instances : DEFAULT_INSTANCES,
      layouts: deriveResponsiveLayouts(baseLayout.length > 0 ? baseLayout : DEFAULT_BASE_LAYOUT, baseCols),
    };
  }

  return createDefaultDashboardState();
}
