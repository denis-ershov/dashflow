import { create } from 'zustand';
import type { LayoutState, LayoutItem, GridPosition } from '../types/dashboard';
import { compact as compactLayout } from '@/lib/layout-engine';

interface LayoutActions {
  setLayout: (items: LayoutItem[]) => void;
  addItem: (item: LayoutItem) => void;
  removeItem: (id: string) => void;
  updateItemPosition: (id: string, position: Partial<GridPosition>) => void;
  setGridConfig: (config: Partial<Pick<LayoutState, 'cols' | 'rowHeight' | 'gap' | 'compactType'>>) => void;
  compact: () => void;
  reset: () => void;
}

const defaultLayout: LayoutState = {
  items: [],
  cols: 12,
  rowHeight: 60,
  gap: [16, 16],
  compactType: 'vertical',
};

export const useLayoutStore = create<LayoutState & LayoutActions>((set) => ({
  ...defaultLayout,

  setLayout: (items) => set({ items }),

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  updateItemPosition: (id, position) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id
          ? { ...i, position: { ...i.position, ...position } }
          : i
      ),
    })),

  setGridConfig: (config) => set(config),

  compact: () =>
    set((state) => ({
      items: compactLayout(state.items, state.cols, state.compactType),
    })),

  reset: () => set(defaultLayout),
}));
