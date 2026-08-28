import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  StorageAdapter,
  STORAGE_KEYS,
  migrateDashboardState,
  deriveResponsiveLayouts,
  createDefaultDashboardState,
  findFirstAvailablePosition,
  resolveLayoutCollisions,
  type Breakpoint,
  type BaseColumns,
  type LayoutItem,
  type ResponsiveLayouts,
  type ActiveModal,
} from '@/core/storage';
import type { WidgetInstance } from '@/core/widget';

export type { ActiveModal };

export interface LegacyWidgetItem {
  instanceId: string;
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: any;
}

export interface DashboardState {
  version: 2;
  isEditMode: boolean;
  isLocked: boolean;
  layoutMode: 'zen' | 'modular';
  heroSettings: import('@/core/storage').HeroSettings;
  speedDialLinks: import('@/core/storage').SpeedDialLink[];
  isCommandPaletteOpen: boolean;
  baseColumns: BaseColumns;
  /** Псевдоним baseColumns для обратной совместимости с v1 */
  columns: BaseColumns;
  gap: number;
  activeModal: ActiveModal;
  instances: WidgetInstance[];
  layouts: ResponsiveLayouts;
  /** Плоский массив виджетов для обратной совместимости с компонентами v1 */
  widgets: LegacyWidgetItem[];

  // Actions
  toggleEditMode: () => void;
  setEditMode: (val: boolean) => void;
  setLocked: (val: boolean) => void;
  setLayoutMode: (mode: 'zen' | 'modular') => void;
  updateHeroSettings: (settings: Partial<import('@/core/storage').HeroSettings>) => void;
  addSpeedDialLink: (link: Omit<import('@/core/storage').SpeedDialLink, 'id'>) => void;
  removeSpeedDialLink: (id: string) => void;
  updateSpeedDialLink: (id: string, link: Partial<import('@/core/storage').SpeedDialLink>) => void;
  setCommandPaletteOpen: (val: boolean) => void;
  setBaseColumns: (cols: BaseColumns) => void;
  setColumns: (cols: BaseColumns) => void;
  setGap: (gap: number) => void;
  setActiveModal: (modal: ActiveModal) => void;
  initializeDashboard: () => void;

  addWidget: (
    widgetId: string,
    defaultW?: number,
    defaultH?: number,
    initialSettings?: Record<string, unknown>,
  ) => void;
  removeWidget: (instanceId: string) => void;
  updateWidgetSettings: (instanceId: string, settings: Record<string, unknown>) => void;
  updateLayout: (
    breakpointOrItems: Breakpoint | Array<{ i: string; x: number; y: number; w: number; h: number }>,
    maybeItems?: Array<{ i: string; x: number; y: number; w: number; h: number }>,
  ) => void;
  reorderWidgets: (breakpoint: Breakpoint, activeId: string, overId: string) => void;
  resetDashboard: () => void;
}

function computeLegacyWidgets(instances: WidgetInstance[], layouts: ResponsiveLayouts): LegacyWidgetItem[] {
  return instances.map((inst) => {
    const l = layouts.xl.find((i) => i.i === inst.instanceId);
    return {
      instanceId: inst.instanceId,
      widgetId: inst.widgetId,
      x: l?.x ?? 0,
      y: l?.y ?? 0,
      w: l?.w ?? 4,
      h: l?.h ?? 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      settings: inst.settings as any,
    };
  });
}

const defaultInitial = createDefaultDashboardState();

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...defaultInitial,
      columns: defaultInitial.baseColumns,
      widgets: computeLegacyWidgets(defaultInitial.instances, defaultInitial.layouts),
      isCommandPaletteOpen: false,

      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
      setEditMode: (val) => set({ isEditMode: val }),
      setLocked: (val) => set({ isLocked: val }),
      setLayoutMode: (mode) => set({ layoutMode: mode }),
      updateHeroSettings: (settings) =>
        set((state) => ({
          heroSettings: { ...state.heroSettings, ...settings },
        })),
      addSpeedDialLink: (link) =>
        set((state) => ({
          speedDialLinks: [
            ...state.speedDialLinks,
            { ...link, id: `sd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
          ],
        })),
      removeSpeedDialLink: (id) =>
        set((state) => ({
          speedDialLinks: state.speedDialLinks.filter((l) => l.id !== id),
        })),
      updateSpeedDialLink: (id, link) =>
        set((state) => ({
          speedDialLinks: state.speedDialLinks.map((l) => (l.id === id ? { ...l, ...link } : l)),
        })),
      setCommandPaletteOpen: (val) => set({ isCommandPaletteOpen: val }),
      setBaseColumns: (cols) =>
        set((state) => {
          const newLayouts = deriveResponsiveLayouts(state.layouts.xl, cols);
          return {
            baseColumns: cols,
            columns: cols,
            layouts: newLayouts,
            widgets: computeLegacyWidgets(state.instances, newLayouts),
          };
        }),
      setColumns: (cols) => get().setBaseColumns(cols),
      setGap: (gap) => set({ gap }),
      setActiveModal: (modal) => set({ activeModal: modal }),
      initializeDashboard: () => {},

      addWidget: (widgetId, defaultW = 4, defaultH = 3, initialSettings = {}) =>
        set((state) => {
          const instanceId = `${widgetId}-${Date.now()}`;
          const newInstance: WidgetInstance = {
            instanceId,
            widgetId,
            settings: initialSettings,
          };

          const cols = state.baseColumns;
          const currentXl = state.layouts.xl || [];
          
          // Математически гарантированная первая свободная позиция без наложений
          const { x, y } = findFirstAvailablePosition(currentXl, cols, defaultW, defaultH);

          const newLayoutItem: LayoutItem = {
            i: instanceId,
            x,
            y,
            w: Math.min(defaultW, cols),
            h: defaultH,
          };

          const updatedXl = [...currentXl, newLayoutItem];
          const newLayouts = deriveResponsiveLayouts(updatedXl, state.baseColumns);
          const newInstances = [...state.instances, newInstance];

          return {
            instances: newInstances,
            layouts: newLayouts,
            widgets: computeLegacyWidgets(newInstances, newLayouts),
          };
        }),

      removeWidget: (instanceId) =>
        set((state) => {
          const removeFilter = (items: LayoutItem[]) => items.filter((item) => item.i !== instanceId);
          const newInstances = state.instances.filter((w) => w.instanceId !== instanceId);
          const newLayouts: ResponsiveLayouts = {
            xl: removeFilter(state.layouts.xl),
            lg: removeFilter(state.layouts.lg),
            md: removeFilter(state.layouts.md),
            sm: removeFilter(state.layouts.sm),
            xs: removeFilter(state.layouts.xs),
          };

          return {
            instances: newInstances,
            layouts: newLayouts,
            widgets: computeLegacyWidgets(newInstances, newLayouts),
          };
        }),

      updateWidgetSettings: (instanceId, newSettings) =>
        set((state) => {
          const newInstances = state.instances.map((w) =>
            w.instanceId === instanceId
              ? { ...w, settings: { ...w.settings, ...newSettings } }
              : w,
          );
          return {
            instances: newInstances,
            widgets: computeLegacyWidgets(newInstances, state.layouts),
          };
        }),

      updateLayout: (breakpointOrItems, maybeItems) =>
        set((state) => {
          if (Array.isArray(breakpointOrItems)) {
            // v1 вызов с 1 аргументом layoutItems (подразумевает xl)
            const xlItems = resolveLayoutCollisions(breakpointOrItems, state.baseColumns);
            const newLayouts = deriveResponsiveLayouts(xlItems, state.baseColumns);
            return {
              layouts: newLayouts,
              widgets: computeLegacyWidgets(state.instances, newLayouts),
            };
          }

          const breakpoint = breakpointOrItems;
          const layoutItems = resolveLayoutCollisions(maybeItems || [], state.baseColumns);
          const newLayouts: ResponsiveLayouts = {
            ...state.layouts,
            [breakpoint]: layoutItems,
          };

          return {
            layouts: newLayouts,
            widgets: computeLegacyWidgets(state.instances, newLayouts),
          };
        }),

      reorderWidgets: (breakpoint, activeId, overId) =>
        set((state) => {
          const currentLayout = [...state.layouts[breakpoint]];
          const activeIndex = currentLayout.findIndex((item) => item.i === activeId);
          const overIndex = currentLayout.findIndex((item) => item.i === overId);

          if (activeIndex === -1 || overIndex === -1) return state;

          const [movedItem] = currentLayout.splice(activeIndex, 1);
          currentLayout.splice(overIndex, 0, movedItem);

          const newLayouts: ResponsiveLayouts = {
            ...state.layouts,
            [breakpoint]: currentLayout,
          };

          return {
            layouts: newLayouts,
            widgets: computeLegacyWidgets(state.instances, newLayouts),
          };
        }),

      resetDashboard: () => {
        const fresh = createDefaultDashboardState();
        set({
          ...fresh,
          columns: fresh.baseColumns,
          widgets: computeLegacyWidgets(fresh.instances, fresh.layouts),
        });
      },
    }),
    {
      name: STORAGE_KEYS.DASHBOARD,
      version: 2,
      migrate: (persistedState: unknown) => {
        // Резервное копирование состояния v1 перед миграцией (Правило 51)
        if (persistedState && typeof persistedState === 'object' && !('version' in persistedState)) {
          void StorageAdapter.set(STORAGE_KEYS.DASHBOARD_BACKUP_V1, persistedState);
        }
        const migrated = migrateDashboardState(persistedState);
        return {
          ...migrated,
          columns: migrated.baseColumns,
          widgets: computeLegacyWidgets(migrated.instances, migrated.layouts),
        };
      },
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const val = await StorageAdapter.get(name, null);
          return val ? JSON.stringify(val) : null;
        },
        setItem: async (name, value) => {
          try {
            await StorageAdapter.set(name, JSON.parse(value));
          } catch {
            // Ошибки квот обрабатываются в StorageAdapter
          }
        },
        removeItem: async (name) => {
          await StorageAdapter.remove(name);
        },
      })),
    },
  ),
);
