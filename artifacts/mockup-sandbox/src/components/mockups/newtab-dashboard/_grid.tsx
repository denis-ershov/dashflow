import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, MouseSensor, TouchSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal, X, Maximize2, Minimize2 } from "lucide-react";
import { useGridStore, toPixels, snapCol, snapRow, unitW, unitH, GAP, COLS, ROW_H } from "./_store";
import type { WidgetLayout } from "./_store";

type C = {
  card: string; cardHover: string; border: string; borderHover: string;
  primary: string; secondary: string; accent: string;
  text: string; textMuted: string; textSubtle: string;
  glow: string; glowMid: string; glowStrong: string; shimmer: string;
};

// ─── GRID OVERLAY ─────────────────────────────────────────────────────────────

function GridOverlay({ containerW, containerH, c }: { containerW: number; containerH: number; c: C }) {
  const rows = Math.ceil((containerH - GAP) / unitH) + 1;
  const uw = unitW(containerW);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* Column lines */}
      {Array.from({ length: COLS + 1 }).map((_, i) => (
        <div
          key={`c${i}`}
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: GAP + i * uw - (i > 0 ? GAP / 2 : 0),
            background: `rgba(77,168,218,0.07)`,
          }}
        />
      ))}
      {/* Row lines */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={`r${i}`}
          className="absolute left-0 right-0 h-px"
          style={{
            top: GAP + i * unitH - (i > 0 ? GAP / 2 : 0),
            background: `rgba(77,168,218,0.07)`,
          }}
        />
      ))}
      {/* Cell dots */}
      {Array.from({ length: COLS }).map((_, ci) =>
        Array.from({ length: rows }).map((_, ri) => (
          <div
            key={`d${ci}-${ri}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: GAP + ci * uw - 2,
              top: GAP + ri * unitH - 2,
              background: `rgba(77,168,218,0.18)`,
            }}
          />
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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="absolute rounded-[24px]"
      style={{
        left: px.x, top: px.y, width: px.w, height: px.h,
        background: `rgba(0,124,199,0.08)`,
        border: `2px dashed ${c.secondary}55`,
        backdropFilter: "blur(4px)",
        zIndex: 5,
        boxShadow: `inset 0 0 20px rgba(0,124,199,0.05), 0 0 30px rgba(0,124,199,0.06)`,
      }}
    >
      <div
        className="absolute inset-0 rounded-[22px]"
        style={{ background: `linear-gradient(135deg, rgba(0,124,199,0.05), transparent)` }}
      />
    </motion.div>
  );
}

// ─── RESIZE HANDLE ────────────────────────────────────────────────────────────

function ResizeHandle({ layout, containerW }: { layout: WidgetLayout; containerW: number }) {
  const resizeWidget = useGridStore((s) => s.resizeWidget);
  const startRef = useRef<{ mx: number; my: number; iw: number; ih: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const px = toPixels(layout, containerW);
      startRef.current = { mx: e.clientX, my: e.clientY, iw: px.w, ih: px.h };
      setResizing(true);

      const uw = unitW(containerW);

      const onMove = (ev: MouseEvent) => {
        if (!startRef.current) return;
        const dx = ev.clientX - startRef.current.mx;
        const dy = ev.clientY - startRef.current.my;
        const newW = Math.max(layout.minW, Math.min(layout.maxW, Math.round((startRef.current.iw + dx) / uw)));
        const newH = Math.max(layout.minH, Math.min(layout.maxH, Math.round((startRef.current.ih + dy) / unitH)));
        resizeWidget(layout.id, newW, newH);
      };

      const onUp = () => {
        startRef.current = null;
        setResizing(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [layout, containerW, resizeWidget]
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
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
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setSpotlight({ x: e.clientX - r.left, y: e.clientY - r.top });
  }, []);

  return (
    <div
      ref={(el) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        dragNodeRef?.(el);
      }}
      className="relative w-full h-full rounded-[28px] overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered || isDragging ? c.cardHover : c.card,
        border: `1px solid ${editMode ? `rgba(77,168,218,0.28)` : hovered ? c.borderHover : c.border}`,
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        transition: "background 0.22s, border-color 0.22s",
        outline: editMode ? `2px dashed rgba(77,168,218,0.22)` : "none",
        outlineOffset: "3px",
      }}
    >
      {/* Top shine */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 5%, ${c.shimmer} 35%, ${c.secondary}22 55%, transparent 95%)` }}
      />
      {/* Spotlight */}
      {hovered && !isDragging && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(280px circle at ${spotlight.x}px ${spotlight.y}px, ${c.glowStrong}15, transparent 65%)`,
          }}
        />
      )}
      {/* Drag glow during drag */}
      {isDragging && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle at 50% 40%, rgba(0,124,199,0.14), transparent 70%)` }}
        />
      )}

      {/* Edit mode header */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 h-9 flex items-center justify-between px-3 z-20"
            style={{
              background: `linear-gradient(180deg, rgba(0,20,40,0.6) 0%, transparent 100%)`,
              backdropFilter: "blur(4px)",
            }}
          >
            {/* Drag handle */}
            <div
              {...dragListeners}
              className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing"
              style={{ touchAction: "none" }}
            >
              <GripHorizontal size={13} style={{ color: "rgba(77,168,218,0.7)" }} />
              <span style={{ color: "rgba(232,244,251,0.55)", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.5px" }}>
                {layout.title}
              </span>
            </div>
            {/* Actions */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => removeWidget(layout.id)}
              className="w-5 h-5 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <X size={9} style={{ color: "#ef4444" }} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        className="w-full h-full"
        style={{ paddingTop: editMode ? "36px" : 0, transition: "padding-top 0.2s", boxSizing: "border-box" }}
      >
        {children}
      </div>

      {/* Resize handle */}
      <AnimatePresence>
        {editMode && <ResizeHandle layout={layout} containerW={containerW} />}
      </AnimatePresence>
    </div>
  );
}

// ─── DRAGGABLE WIDGET ─────────────────────────────────────────────────────────

function DraggableWidget({
  layout, containerW, c, children,
}: {
  layout: WidgetLayout; containerW: number; c: C; children: React.ReactNode;
}) {
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
      transition={
        isDragging
          ? { scale: { type: "spring", stiffness: 350, damping: 22 } }
          : { type: "spring", stiffness: 300, damping: 28 }
      }
      style={{
        position: "absolute",
        left: px.x,
        top: px.y,
        width: px.w,
        height: px.h,
        // Apply drag offset directly (no lag = Figma feel)
        transform: transform
          ? `translate3d(${dragX}px,${dragY}px,0) rotate(${rotation}deg)`
          : undefined,
        cursor: editMode ? (isDragging ? "grabbing" : "grab") : "default",
        willChange: "transform",
      }}
      {...attributes}
    >
      <WidgetShell
        layout={layout}
        containerW={containerW}
        c={c}
        isDragging={isDragging}
        dragListeners={listeners as Record<string, unknown>}
        dragNodeRef={setNodeRef}
      >
        {children}
      </WidgetShell>
    </motion.div>
  );
}

// ─── GRID LAYOUT ──────────────────────────────────────────────────────────────

interface GridLayoutProps {
  c: C;
  widgetMap: Record<string, React.ReactNode>;
}

export function GridLayout({ c, widgetMap }: GridLayoutProps) {
  const { layouts, editMode, moveWidget } = useGridStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(1200);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width);
    });
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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const id = String(event.active.id);
      const layout = layouts.find((l) => l.id === id);
      if (!layout) return;
      const px = toPixels(layout, containerW);
      const newX = snapCol(px.x + event.delta.x, containerW, layout.w);
      const newY = snapRow(px.y + event.delta.y, layout.h);
      moveWidget(id, newX, newY);
      setActiveId(null);
      setDragDelta(null);
    },
    [layouts, containerW, moveWidget]
  );

  // Compute placeholder position during active drag
  const placeholder = (() => {
    if (!activeId || !dragDelta) return null;
    const layout = layouts.find((l) => l.id === activeId);
    if (!layout) return null;
    const px = toPixels(layout, containerW);
    const snappedX = snapCol(px.x + dragDelta.x, containerW, layout.w);
    const snappedY = snapRow(px.y + dragDelta.y, layout.h);
    return { ...layout, x: snappedX, y: snappedY };
  })();

  // Container height based on tallest widget
  const maxRow = layouts.reduce((max, l) => Math.max(max, l.y + l.h), 0);
  const containerH = GAP + maxRow * unitH + 60;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: containerH, minHeight: 500 }}
      >
        {/* Grid overlay (edit mode) */}
        <AnimatePresence>
          {editMode && <GridOverlay containerW={containerW} containerH={containerH} c={c} />}
        </AnimatePresence>

        {/* Drop placeholder */}
        <AnimatePresence>
          {placeholder && (
            <DropPlaceholder
              key="placeholder"
              layout={placeholder}
              containerW={containerW}
              c={c}
            />
          )}
        </AnimatePresence>

        {/* Widgets */}
        {layouts.map((layout) => (
          <DraggableWidget
            key={layout.id}
            layout={layout}
            containerW={containerW}
            c={c}
          >
            {widgetMap[layout.id]}
          </DraggableWidget>
        ))}
      </div>
    </DndContext>
  );
}
