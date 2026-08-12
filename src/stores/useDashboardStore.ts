import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StorageAdapter } from '@/services/storage/StorageAdapter';

export interface WidgetItem {
  instanceId: string;
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  settings?: Record<string, any>;
}

export type ActiveModal = 'add' | 'addWidget' | 'settings' | 'themes' | 'marketplace' | 'importExport' | null;

interface DashboardState {
  isEditMode: boolean;
  isLocked: boolean;
  isCommandPaletteOpen: boolean;
  columns: 12 | 16 | 24;
  gap: number;
  activeModal: ActiveModal;
  widgets: WidgetItem[];

  toggleEditMode: () => void;
  setEditMode: (val: boolean) => void;
  setLocked: (val: boolean) => void;
  setCommandPaletteOpen: (val: boolean) => void;
  setColumns: (cols: 12 | 16 | 24) => void;
  setGap: (gap: number) => void;
  setActiveModal: (modal: ActiveModal) => void;
  initializeDashboard: () => void;

  addWidget: (widgetId: string, defaultW?: number, defaultH?: number) => void;
  removeWidget: (instanceId: string) => void;
  updateWidgetSettings: (instanceId: string, settings: Record<string, any>) => void;
  updateLayout: (layoutItems: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      isEditMode: false,
      isLocked: false,
      isCommandPaletteOpen: false,
      columns: 12,
      gap: 16,
      activeModal: null,
      widgets: [
        { instanceId: 'clock-1', widgetId: 'clock', x: 0, y: 0, w: 4, h: 2 },
        { instanceId: 'weather-1', widgetId: 'weather', x: 4, y: 0, w: 4, h: 2 },
        { instanceId: 'search-1', widgetId: 'search', x: 8, y: 0, w: 4, h: 2 },
        { instanceId: 'rss-1', widgetId: 'rssReader', x: 0, y: 2, w: 6, h: 4 },
        { instanceId: 'bookmarks-1', widgetId: 'bookmarks', x: 6, y: 2, w: 6, h: 4 },
      ],

      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
      setEditMode: (val) => set({ isEditMode: val }),
      setLocked: (val) => set({ isLocked: val }),
      setCommandPaletteOpen: (val) => set({ isCommandPaletteOpen: val }),
      setColumns: (cols) => set({ columns: cols }),
      setGap: (gap) => set({ gap }),
      setActiveModal: (modal) => set({ activeModal: modal }),
      initializeDashboard: () => {},

      addWidget: (widgetId, defaultW = 4, defaultH = 3) =>
        set((state) => {
          const newInstanceId = `${widgetId}-${Date.now()}`;
          return {
            widgets: [
              ...state.widgets,
              {
                instanceId: newInstanceId,
                widgetId,
                x: (state.widgets.length * 4) % state.columns,
                y: Math.floor((state.widgets.length * 4) / state.columns) * 3,
                w: defaultW,
                h: defaultH,
              },
            ],
          };
        }),

      removeWidget: (instanceId) =>
        set((state) => ({
          widgets: state.widgets.filter((w) => w.instanceId !== instanceId),
        })),

      updateWidgetSettings: (instanceId, newSettings) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.instanceId === instanceId
              ? { ...w, settings: { ...w.settings, ...newSettings } }
              : w
          ),
        })),

      updateLayout: (layoutItems) =>
        set((state) => ({
          widgets: state.widgets.map((w) => {
            const item = layoutItems.find((l) => l.i === w.instanceId);
            if (item) {
              return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
            }
            return w;
          }),
        })),
    }),
    {
      name: 'dashflow_dashboard_store',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const val = await StorageAdapter.get(name, null);
          return val ? JSON.stringify(val) : null;
        },
        setItem: async (name, value) => {
          await StorageAdapter.set(name, JSON.parse(value));
        },
        removeItem: async (name) => {
          await StorageAdapter.remove(name);
        },
      })),
    }
  )
);
