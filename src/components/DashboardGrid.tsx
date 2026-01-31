import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useLayoutStore } from '@/stores';
import { GridItem } from './GridItem';

// Selective subscriptions to avoid re-renders when unrelated state changes
const useGridLayout = () => {
  const items = useLayoutStore((s) => s.items);
  const cols = useLayoutStore((s) => s.cols);
  const rowHeight = useLayoutStore((s) => s.rowHeight);
  const gap = useLayoutStore((s) => s.gap);
  return { items, cols, rowHeight, gap };
};

export function DashboardGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const rafRef = useRef<number>();

  const { items, cols, rowHeight, gap } = useGridLayout();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setContainerWidth(el.offsetWidth));
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const [gapX, gapY] = gap;
  const colWidth = useMemo(
    () => (containerWidth > 0 ? (containerWidth - (cols + 1) * gapX) / cols : 0),
    [containerWidth, cols, gapX]
  );

  const gridHeight = useMemo(
    () =>
      items.length > 0
        ? Math.max(
            ...items.map((i) => (i.position.y + i.position.h) * (rowHeight + gapY) + gapY)
          )
        : rowHeight * 2,
    [items, rowHeight, gapY]
  );

  const toPixelPosition = useCallback(
    (x: number, y: number, w: number, h: number) => ({
      left: x * (colWidth + gapX) + gapX,
      top: y * (rowHeight + gapY) + gapY,
      width: w * (colWidth + gapX) - gapX,
      height: h * (rowHeight + gapY) - gapY,
    }),
    [colWidth, gapX, rowHeight, gapY]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen"
      style={{ height: gridHeight }}
    >
      {items.map((item) => (
        <GridItem
          key={item.id}
          item={item}
          cols={cols}
          colWidth={colWidth}
          rowHeight={rowHeight}
          gap={gap}
          toPixelPosition={toPixelPosition}
        />
      ))}
    </div>
  );
}
