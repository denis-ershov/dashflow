import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, MouseSensor, TouchSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { GripHorizontal, X } from "lucide-react";
import { useGridStore, useBookmarkItemsStore, resolveCollisions, toPixels, snapCol, snapRow, unitW, unitH, GAP, COLS } from "./store";
import type { WidgetLayout } from "./store";
import type { C } from "./widgets";
import { useTranslation } from "../../utils/i18n";

// Map widget id → translation key
function useWidgetTitle(id: string): string {
  const t = useTranslation();
  const bmIcons = useBookmarkItemsStore(s => s.icons);
  const bmFolders = useBookmarkItemsStore(s => s.folders);
  const map: Record<string, string> = {
    clock:      t.w_clock,
    weather:    t.w_weather,
    quicklinks: t.w_quicklinks,
    todo:       t.w_tasks,
    bookmarks:  t.w_bookmarks,
    calendar:   t.w_calendar,
    notes:      t.w_notes,
    pomodoro:   t.w_pomodoro,
    habit:      t.w_habit,
    currency:   t.w_currency,
  };
  if (map[id]) return map[id];
  if (id.startsWith("bmi:") && bmIcons[id]) return bmIcons[id].label;
  if (id.startsWith("bmf:") && bmFolders[id]) return bmFolders[id].label;
  return id;
}

// ─── GRID OVERLAY ─────────────────────────────────────────────────────────────

function GridOverlay({ containerW, containerH }: { containerW: number; containerH: number; c: C }) {
  const rows = Math.ceil((containerH - GAP) / unitH) + 1;
  const uw = unitW(containerW);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {Array.from({ length: COLS + 1 }).map((_, i) => (
        <div key={`c${i}`} className="absolute top-0 bottom-0 w-px"
          style={{ left: GAP + i * uw - (i > 0 ? GAP / 2 : 0), background: "rgba(77,168,218,0.07)" }} />
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`r${i}`} className="absolute left-0 right-0 h-px"
          style={{ top: GAP + i * unitH - (i > 0 ? GAP / 2 : 0), background: "rgba(77,168,218,0.07)" }} />
      ))}
      {Array.from({ length: COLS }).map((_, ci) =>
        Array.from({ length: rows }).map((_, ri) => (
          <div key={`d${ci}-${ri}`} className="absolute w-1 h-1 rounded-full"
            style={{ left: GAP + ci * uw - 2, top: GAP + ri * unitH - 2, background: "rgba(77,168,218,0.18)" }} />
        ))
      )}
    </motion.div>
  );
}

// ─── DROP PLACEHOLDER ─────────────────────────────────────────────────────────

function DropPlaceholder({ layout, containerW, c }: { layout: WidgetLayout; containerW: number; c: C }) {
  const px = toPixels(layout, containerW);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="absolute rounded-[24px]"
      style={{
        left: px.x, top: px.y, width: px.w, height: px.h,
        background: "rgba(0,124,199,0.08)",
        border: `2px dashed ${c.secondary}55`,
        backdropFilter: "blur(4px)", zIndex: 5,
        boxShadow: "inset 0 0 20px rgba(0,124,199,0.05), 0 0 30px rgba(0,124,199,0.06)",
      }}
    >
      <div className="absolute inset-0 rounded-[22px]"
        style={{ background: "linear-gradient(135deg, rgba(0,124,199,0.05), transparent)" }} />
    </motion.div>
  );
}

// ─── RESIZE HANDLE ────────────────────────────────────────────────────────────

function ResizeHandle({ layout, containerW }: { layout: WidgetLayout; containerW: number }) {
  const setLayouts = useGridStore((s) => s.setLayouts);
  const allLayouts = useGridStore((s) => s.layouts);
  const startRef = useRef<{ mx: number; my: number; iw: number; ih: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const px = toPixels(layout, containerW);
    startRef.current = { mx: e.clientX, my: e.clientY, iw: px.w, ih: px.h };
    setResizing(true);
    const uw = unitW(containerW);
    let latestW = layout.w;
    let latestH = layout.h;

    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const dx = ev.clientX - startRef.current.mx;
      const dy = ev.clientY - startRef.current.my;
      latestW = Math.max(layout.minW, Math.min(layout.maxW, Math.round((startRef.current.iw + dx) / uw)));
      latestH = Math.max(layout.minH, Math.min(layout.maxH, Math.round((startRef.current.ih + dy) / unitH)));
      setLayouts(resolveCollisions(
        allLayouts.map(l => l.id === layout.id ? { ...l, w: latestW, h: latestH } : l),
        layout.id,
      ));
    };

    const onUp = () => {
      startRef.current = null;
      setResizing(false);
      setLayouts(resolveCollisions(
        allLayouts.map(l => l.id === layout.id ? { ...l, w: latestW, h: latestH } : l),
        layout.id,
      ));
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [layout, containerW, setLayouts, allLayouts]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
      whileHover={{ scale: 1.25 }}
      onMouseDown={handleMouseDown}
      className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-xl flex items-center justify-center cursor-se-resize z-10"
      style={{
        background: resizing ? "rgba(0,124,199,0.4)" : "rgba(77,168,218,0.18)",
        border: "1px solid rgba(77,168,218,0.4)",
        boxShadow: resizing ? "0 0 12px rgba(0,124,199,0.6)" : "none",
        transition: "background 0.15s, box-shadow 0.15s",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M3 9 L9 9 L9 3" stroke="rgba(77,168,218,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 9 L9 9 L9 6" stroke="rgba(77,168,218,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

// ─── WIDGET SHELL ─────────────────────────────────────────────────────────────

interface WidgetShellProps {
  layout: WidgetLayout;
  containerW: number;
  c: C;
  isDragging?: boolean;
  children: React.ReactNode;
  dragListeners?: Record<string, unknown>;
  dragNodeRef?: (el: HTMLElement | null) => void;
}

export function WidgetShell({ layout, containerW, c, isDragging, children, dragListeners, dragNodeRef }: WidgetShellProps) {
  const editMode = useGridStore((s) => s.editMode);
  const removeWidget = useGridStore((s) => s.removeWidget);
  const removeIcon = useBookmarkItemsStore((s) => s.removeIcon);
  const removeFolder = useBookmarkItemsStore((s) => s.removeFolder);
  const widgetTitle = useWidgetTitle(layout.id);

  const handleRemove = useCallback(() => {
    removeWidget(layout.id);
    if (layout.id.startsWith("bmi_")) removeIcon(layout.id);
    if (layout.id.startsWith("bmf_")) removeFolder(layout.id);
  }, [layout.id, removeWidget, removeIcon, removeFolder]);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0 });
  const [shellH, setShellH] = useState(200);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, above: true });
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setSpotlight({ x: e.clientX - r.left, y: e.clientY - r.top });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    tooltipTimerRef.current = setTimeout(() => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const above = r.top > 52;
      setTooltipPos({
        x: r.left + r.width / 2,
        y: above ? r.top - 8 : r.bottom + 8,
        above,
      });
      setTooltipVisible(true);
    }, 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setTooltipVisible(false);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  // Clear tooltip timer on unmount
  useEffect(() => () => { if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current); }, []);

  // Track shell height for adaptive layout
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => setShellH(entries[0].contentRect.height));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const isCompact = containerW < 100 || shellH < 100;
  const radius = isCompact ? Math.min(containerW, shellH) * 0.22 : 22;
  const barH = isCompact ? Math.min(28, shellH * 0.46) : 36;
  const barPx = isCompact ? 6 : 12;

  return (
    <>
    <div
      ref={(el) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        dragNodeRef?.(el);
      }}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: radius,
        overflow: "hidden",
        background: hovered || isDragging ? c.cardHover : c.card,
        border: `1px solid ${editMode ? "rgba(77,168,218,0.28)" : hovered ? c.borderHover : c.border}`,
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        transition: "background 0.22s, border-color 0.22s, border-radius 0.15s",
        outline: editMode ? "2px dashed rgba(77,168,218,0.22)" : "none",
        outlineOffset: "3px",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 5%, ${c.shimmer} 35%, ${c.secondary}22 55%, transparent 95%)` }} />

      {hovered && !isDragging && (
        <div className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(280px circle at ${spotlight.x}px ${spotlight.y}px, ${c.glowStrong}15, transparent 65%)` }} />
      )}

      {isDragging && (
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 40%, rgba(0,124,199,0.14), transparent 70%)" }} />
      )}

      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-between z-20"
            style={{
              height: barH, paddingLeft: barPx, paddingRight: barPx,
              background: "linear-gradient(180deg, rgba(0,20,40,0.7) 0%, transparent 100%)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              {...dragListeners}
              className="flex items-center cursor-grab active:cursor-grabbing overflow-hidden"
              style={{ touchAction: "none", gap: isCompact ? 0 : 6, minWidth: 0 }}
            >
              <GripHorizontal size={isCompact ? 10 : 13} style={{ color: "rgba(77,168,218,0.7)", flexShrink: 0 }} />
              {!isCompact && (
                <span style={{ color: "rgba(232,244,251,0.55)", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {widgetTitle}
                </span>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
              onClick={handleRemove}
              style={{
                width: isCompact ? 16 : 20, height: isCompact ? 16 : 20, borderRadius: 6, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <X size={isCompact ? 7 : 9} style={{ color: "#ef4444" }} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full" style={{ paddingTop: editMode ? barH : 0, transition: "padding-top 0.2s", boxSizing: "border-box" }}>
        {children}
      </div>

      <AnimatePresence>
        {editMode && <ResizeHandle layout={layout} containerW={containerW} />}
      </AnimatePresence>
    </div>

    {/* Hover tooltip — rendered at document.body to escape overflow:hidden */}
    {createPortal(
      <AnimatePresence>
        {tooltipVisible && !editMode && !isDragging && (
          <motion.div
            key={layout.id + "-tooltip"}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: tooltipPos.above ? "translateX(-50%) translateY(-100%)" : "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 99999,
              whiteSpace: "nowrap",
              padding: "5px 10px",
              borderRadius: 8,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.2px",
              background: "rgba(8,15,23,0.94)",
              border: "1px solid rgba(77,168,218,0.25)",
              color: "rgba(232,244,251,0.9)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}
          >
            {widgetTitle}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
  </>
  );
}

// ─── DRAGGABLE WIDGET ─────────────────────────────────────────────────────────

function DraggableWidget({ layout, containerW, c, children }: { layout: WidgetLayout; containerW: number; c: C; children: React.ReactNode }) {
  const editMode = useGridStore((s) => s.editMode);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: layout.id,
    disabled: !editMode,
  });

  const px = toPixels(layout, containerW);
  const dragX = transform?.x ?? 0;
  const dragY = transform?.y ?? 0;
  const rotation = isDragging ? Math.max(-4, Math.min(4, dragX * 0.012)) : 0;

  return (
    <motion.div
      layout={!isDragging}
      layoutId={layout.id}
      animate={{
        scale: isDragging ? 1.04 : 1,
        zIndex: isDragging ? 100 : 1,
        filter: isDragging ? "drop-shadow(0 32px 64px rgba(0,0,0,0.55))" : "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
      }}
      transition={isDragging ? { scale: { type: "spring", stiffness: 350, damping: 22 } } : { type: "spring", stiffness: 300, damping: 28 }}
      style={{
        position: "absolute",
        left: px.x, top: px.y, width: px.w, height: px.h,
        transform: transform ? `translate3d(${dragX}px,${dragY}px,0) rotate(${rotation}deg)` : undefined,
        cursor: editMode ? (isDragging ? "grabbing" : "grab") : "default",
        willChange: "transform",
      }}
      {...attributes}
    >
      <WidgetShell layout={layout} containerW={containerW} c={c} isDragging={isDragging}
        dragListeners={listeners as Record<string, unknown>} dragNodeRef={setNodeRef}>
        {children}
      </WidgetShell>
    </motion.div>
  );
}

// ─── GRID LAYOUT ──────────────────────────────────────────────────────────────

export function GridLayout({ c, widgetMap }: { c: C; widgetMap: Record<string, React.ReactNode> }) {
  const { layouts, editMode, moveWidget, setLayouts } = useGridStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(1200);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setContainerW(entries[0].contentRect.width));
    ro.observe(el);
    setContainerW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setDragDelta(null);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    setDragDelta({ x: event.delta.x, y: event.delta.y });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const id = String(event.active.id);
    const layout = layouts.find((l) => l.id === id);
    if (!layout) return;
    const px = toPixels(layout, containerW);
    const newX = snapCol(px.x + event.delta.x, containerW, layout.w);
    const newY = snapRow(px.y + event.delta.y, layout.h);
    const updated = layouts.map(l => l.id === id ? { ...l, x: newX, y: newY } : l);
    setLayouts(resolveCollisions(updated, id));
    setActiveId(null);
    setDragDelta(null);
  }, [layouts, containerW, setLayouts]);

  // Compute snapped position of the dragged widget
  const snappedDrag = (() => {
    if (!activeId || !dragDelta) return null;
    const layout = layouts.find((l) => l.id === activeId);
    if (!layout) return null;
    const px = toPixels(layout, containerW);
    return {
      x: snapCol(px.x + dragDelta.x, containerW, layout.w),
      y: snapRow(px.y + dragDelta.y, layout.h),
    };
  })();

  // Build preview layouts: moved widget at snapped position, others pushed by collision
  const previewLayouts: WidgetLayout[] | null = (() => {
    if (!activeId || !snappedDrag) return null;
    const layout = layouts.find((l) => l.id === activeId);
    if (!layout) return null;
    if (snappedDrag.x === layout.x && snappedDrag.y === layout.y) return null;
    const withMoved = layouts.map(l =>
      l.id === activeId ? { ...l, x: snappedDrag.x, y: snappedDrag.y } : l
    );
    return resolveCollisions(withMoved, activeId);
  })();

  const placeholder = (() => {
    if (!activeId || !snappedDrag) return null;
    const layout = layouts.find(l => l.id === activeId);
    if (!layout) return null;
    return { ...layout, ...snappedDrag };
  })();

  const displayLayouts = previewLayouts ?? layouts;
  const maxRow = displayLayouts.reduce((max, l) => Math.max(max, l.y + l.h), 0);
  const containerH = GAP + maxRow * unitH + 60;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div ref={containerRef} className="relative w-full" style={{ height: containerH, minHeight: 500 }}>
        <AnimatePresence>
          {editMode && <GridOverlay containerW={containerW} containerH={containerH} c={c} />}
        </AnimatePresence>
        <AnimatePresence>
          {placeholder && <DropPlaceholder key="placeholder" layout={placeholder} containerW={containerW} c={c} />}
        </AnimatePresence>
        {layouts.map((layout) => {
          const renderLayout = previewLayouts && layout.id !== activeId
            ? (previewLayouts.find(l => l.id === layout.id) ?? layout)
            : layout;
          return (
            <DraggableWidget key={layout.id} layout={renderLayout} containerW={containerW} c={c}>
              {widgetMap[layout.id]}
            </DraggableWidget>
          );
        })}
      </div>
    </DndContext>
  );
}
