import { create } from "zustand";

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
  title: string;
}

interface GridStore {
  layouts: WidgetLayout[];
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  toggleEditMode: () => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, w: number, h: number) => void;
  removeWidget: (id: string) => void;
}

export const INITIAL_LAYOUTS: WidgetLayout[] = [
  { id: "clock",      x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2, maxW: 6, maxH: 5, title: "Clock" },
  { id: "weather",    x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 3, maxW: 8, maxH: 5, title: "Weather" },
  { id: "quicklinks", x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 3, maxW: 6, maxH: 5, title: "Quick Access" },
  { id: "todo",       x: 0, y: 3, w: 8, h: 4, minW: 4, minH: 3, maxW: 12, maxH: 7, title: "Tasks" },
  { id: "bookmarks",  x: 8, y: 3, w: 4, h: 4, minW: 3, minH: 3, maxW: 6, maxH: 7, title: "Bookmarks" },
];

export const useGridStore = create<GridStore>()((set) => ({
  layouts: INITIAL_LAYOUTS,
  editMode: false,
  setEditMode: (v) => set({ editMode: v }),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  moveWidget: (id, x, y) =>
    set((s) => ({ layouts: s.layouts.map((l) => (l.id === id ? { ...l, x, y } : l)) })),
  resizeWidget: (id, w, h) =>
    set((s) => ({ layouts: s.layouts.map((l) => (l.id === id ? { ...l, w, h } : l)) })),
  removeWidget: (id) =>
    set((s) => ({ layouts: s.layouts.filter((l) => l.id !== id) })),
}));

// ─── GRID MATH CONSTANTS ─────────────────────────────────────────────────────

export const COLS = 12;
export const ROW_H = 88;
export const GAP = 16;

export function unitW(cw: number) {
  return (cw - GAP * (COLS + 1)) / COLS + GAP;
}

export const unitH = ROW_H + GAP;

export function toPixels(l: Pick<WidgetLayout, "x" | "y" | "w" | "h">, cw: number) {
  const uw = unitW(cw);
  return {
    x: GAP + l.x * uw,
    y: GAP + l.y * unitH,
    w: l.w * uw - GAP,
    h: l.h * unitH - GAP,
  };
}

export function snapCol(px: number, cw: number, span: number) {
  const uw = unitW(cw);
  return Math.max(0, Math.min(COLS - span, Math.round((px - GAP) / uw)));
}

export function snapRow(py: number, span: number) {
  return Math.max(0, Math.round((py - GAP) / unitH));
}
