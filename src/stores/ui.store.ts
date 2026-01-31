import { create } from 'zustand';
import type { UIState } from '../types/dashboard';

interface UIActions {
  setEditing: (isEditing: boolean) => void;
  setActiveWidget: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setModalOpen: (modal: string | null) => void;
  setDragInProgress: (inProgress: boolean) => void;
  reset: () => void;
}

const defaultUI: UIState = {
  isEditing: false,
  activeWidgetId: null,
  sidebarOpen: false,
  modalOpen: null,
  dragInProgress: false,
};

export const useUIStore = create<UIState & UIActions>((set) => ({
  ...defaultUI,

  setEditing: (isEditing) => set({ isEditing }),

  setActiveWidget: (activeWidgetId) => set({ activeWidgetId }),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  setModalOpen: (modalOpen) => set({ modalOpen }),

  setDragInProgress: (dragInProgress) => set({ dragInProgress }),

  reset: () => set(defaultUI),
}));
