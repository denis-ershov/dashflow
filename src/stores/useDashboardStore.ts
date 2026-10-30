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
  type HeroSettings,
  type SpeedDialLink,
} from '@/core/storage';
import type { WidgetInstance } from '@/core/widget';

export type { ActiveModal };

export type LayoutMode = 'zen' | 'modular' | 'canvas';

export interface DashboardState {
  version: 2;
  isEditMode: boolean;
  layoutMode: LayoutMode;
  heroSettings: HeroSettings;
  speedDialLinks: SpeedDialLink[];
  isCommandPaletteOpen: boolean;
  baseColumns: BaseColumns;
  gap: number;
  activeModal: ActiveModal;
  instances: WidgetInstance[];
  layouts: ResponsiveLayouts;

  // Actions
  toggleEditMode: () => void;
  setEditMode: (val: boolean) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  updateHeroSettings: (settings: Partial<HeroSettings>) => void;
  addSpeedDialLink: (link: Omit<SpeedDialLink, 'id'>) => void;
  removeSpeedDialLink: (id: string) => void;
  updateSpeedDialLink: (id: string, link: Partial<SpeedDialLink>) => void;
  setCommandPaletteOpen: (val: boolean) => void;
  setBaseColumns: (cols: BaseColumns) => void;
  setGap: (gap: number) => void;
  setActiveModal: (modal: ActiveModal) => void;

  addWidget: (
    widgetId: string,
    defaultW?: number,
    defaultH?: number,
    initialSettings?: Record<string, unknown>,
  ) => void;
  removeWidget: (instanceId: string) => void;
  updateWidgetSettings: (instanceId: string, settings: Record<string, unknown>) => void;
  updateLayout: (breakpoint: Breakpoint, items: LayoutItem[]) => void;
  resetDashboard: () => void;
}

/**
 * Поля, которые переживают перезагрузку вкладки. Состояние UI (открытая модалка,
 * режим правки, палитра команд) намеренно не сохраняется.
 */
const PERSISTED_KEYS = [
  'version',
  'baseColumns',
  'gap',
  'layoutMode',
  'heroSettings',
  'speedDialLinks',
  'instances',
  'layouts',
] as const satisfies ReadonlyArray<keyof DashboardState>;

export type PersistedDashboardState = Pick<DashboardState, (typeof PERSISTED_KEYS)[number]>;

/** Выбирает из произвольного объекта только сохраняемые поля дашборда */
export function pickPersistedDashboard(source: unknown): Partial<PersistedDashboardState> {
  if (!source || typeof source !== 'object') return {};
  const result: Record<string, unknown> = {};
  for (const key of PERSISTED_KEYS) {
    if (key in source) result[key] = (source as Record<string, unknown>)[key];
  }
  return result;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      ...createDefaultDashboardState(),
      isCommandPaletteOpen: false,

      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
      setEditMode: (val) => set({ isEditMode: val }),
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
        set((state) => ({
          baseColumns: cols,
          layouts: deriveResponsiveLayouts(state.layouts.xl, cols),
        })),
      setGap: (gap) => set({ gap }),
      setActiveModal: (modal) => set({ activeModal: modal }),

      addWidget: (widgetId, defaultW = 4, defaultH = 3, initialSettings = {}) =>
        set((state) => {
          const instanceId = `${widgetId}-${Date.now()}`;
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

          return {
            instances: [...state.instances, { instanceId, widgetId, settings: initialSettings }],
            layouts: deriveResponsiveLayouts([...currentXl, newLayoutItem], cols),
          };
        }),

      removeWidget: (instanceId) =>
        set((state) => {
          const removeFilter = (items: LayoutItem[]) => items.filter((item) => item.i !== instanceId);
          return {
            instances: state.instances.filter((w) => w.instanceId !== instanceId),
            layouts: {
              xl: removeFilter(state.layouts.xl),
              lg: removeFilter(state.layouts.lg),
              md: removeFilter(state.layouts.md),
              sm: removeFilter(state.layouts.sm),
              xs: removeFilter(state.layouts.xs),
            },
          };
        }),

      updateWidgetSettings: (instanceId, newSettings) =>
        set((state) => ({
          instances: state.instances.map((w) =>
            w.instanceId === instanceId ? { ...w, settings: { ...w.settings, ...newSettings } } : w,
          ),
        })),

      updateLayout: (breakpoint, items) =>
        set((state) => ({
          layouts: {
            ...state.layouts,
            [breakpoint]: resolveLayoutCollisions(items, state.baseColumns),
          },
        })),

      resetDashboard: () => set({ ...createDefaultDashboardState() }),
    }),
    {
      name: STORAGE_KEYS.DASHBOARD,
      version: 2,
      partialize: (state) => pickPersistedDashboard(state),
      // Старые версии сохраняли и состояние UI (activeModal, isEditMode, widgets) —
      // при чтении принимаем только сохраняемые поля, чтобы модалка не открывалась после перезагрузки
      merge: (persisted, current) => ({ ...current, ...pickPersistedDashboard(persisted) }),
      migrate: (persistedState: unknown) => {
        // Резервное копирование состояния v1 перед миграцией (Правило 51)
        if (persistedState && typeof persistedState === 'object' && !('version' in persistedState)) {
          void StorageAdapter.set(STORAGE_KEYS.DASHBOARD_BACKUP_V1, persistedState);
        }
        return pickPersistedDashboard(migrateDashboardState(persistedState));
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
