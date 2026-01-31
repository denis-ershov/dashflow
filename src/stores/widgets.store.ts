import { create } from 'zustand';
import type { WidgetsState, WidgetInstance, WidgetConfig } from '../types/dashboard';

interface WidgetsActions {
  addWidget: (instance: WidgetInstance) => void;
  removeWidget: (id: string) => void;
  updateWidgetConfig: (id: string, config: Partial<WidgetConfig>) => void;
  setWidgetOrder: (order: string[]) => void;
  setInstances: (instances: Record<string, WidgetInstance>) => void;
  reset: () => void;
}

const defaultWidgets: WidgetsState = {
  instances: {},
  order: [],
};

export const useWidgetsStore = create<WidgetsState & WidgetsActions>((set) => ({
  ...defaultWidgets,

  addWidget: (instance) =>
    set((state) => ({
      instances: { ...state.instances, [instance.id]: instance },
      order: [...state.order, instance.id],
    })),

  removeWidget: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.instances;
      return {
        instances: rest,
        order: state.order.filter((o) => o !== id),
      };
    }),

  updateWidgetConfig: (id, config) =>
    set((state) => {
      const instance = state.instances[id];
      if (!instance) return state;
      return {
        instances: {
          ...state.instances,
          [id]: { ...instance, config: { ...instance.config, ...config } },
        },
      };
    }),

  setWidgetOrder: (order) => set({ order }),

  setInstances: (instances) =>
    set((state) => ({
      instances,
      order: state.order.length > 0 ? state.order : Object.keys(instances),
    })),

  reset: () => set(defaultWidgets),
}));
