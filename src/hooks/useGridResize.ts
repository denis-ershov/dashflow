import { useCallback, useRef } from 'react';
import type { GridPosition } from '@/types/dashboard';
import { useLayoutStore } from '@/stores';
import { collides } from '@/lib/layout-engine';

export type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';

interface UseGridResizeOptions {
  itemId: string;
  cols: number;
  rowHeight: number;
  gap: [number, number];
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export function useGridResize({
  itemId,
  cols,
  rowHeight,
  gap,
  minW = 1,
  minH = 1,
  maxW,
  maxH,
  static: isStatic,
}: UseGridResizeOptions) {
  const startRef = useRef<{
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    w: number;
    h: number;
    handle: ResizeHandle;
  } | null>(null);
  const handlersRef = useRef<{ move: (e: MouseEvent | TouchEvent) => void; end: () => void } | null>(null);

  const handleResizeEnd = useCallback(() => {
    startRef.current = null;
    const move = handlersRef.current?.move;
    const end = handlersRef.current?.end;
    if (move) {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
    }
    if (end) {
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchend', end);
    }
    handlersRef.current = null;
    useLayoutStore.getState().compact();
  }, []);

  const handleResizeMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!startRef.current) return;
      e.preventDefault();
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0]?.clientX ?? (e as MouseEvent).clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0]?.clientY ?? (e as MouseEvent).clientY : (e as MouseEvent).clientY;

      const colWidth = (window.innerWidth - (cols + 1) * gap[0]) / cols;
      const deltaGridX = (clientX - startRef.current.clientX) / (colWidth + gap[0]);
      const deltaGridY = (clientY - startRef.current.clientY) / (rowHeight + gap[1]);

      const { handle, x, y, w, h } = startRef.current;
      let newX = x;
      let newY = y;
      let newW = w;
      let newH = h;

      if (handle.includes('e')) newW = Math.round(w + deltaGridX);
      if (handle.includes('w')) {
        newW = Math.round(w - deltaGridX);
        newX = Math.round(x + deltaGridX);
      }
      if (handle.includes('s')) newH = Math.round(h + deltaGridY);
      if (handle.includes('n')) {
        newH = Math.round(h - deltaGridY);
        newY = Math.round(y + deltaGridY);
      }

      newW = Math.max(minW, Math.min(cols - newX, maxW ?? cols, newW));
      newH = Math.max(minH, Math.min(maxH ?? 999, newH));
      newX = Math.max(0, Math.min(cols - newW, newX));
      newY = Math.max(0, newY);

      const items = useLayoutStore.getState().items;
      const others = items.filter((i) => i.id !== itemId);
      const testPos: GridPosition = { x: newX, y: newY, w: newW, h: newH };
      const collision = others.some((o) => collides(testPos, o.position));

      if (!collision) {
        useLayoutStore.getState().updateItemPosition(itemId, {
          x: newX,
          y: newY,
          w: newW,
          h: newH,
        });
      }
    },
    [itemId, cols, rowHeight, gap, minW, minH, maxW, maxH]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, handle: ResizeHandle) => {
      if (isStatic) return;
      e.preventDefault();
      e.stopPropagation();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const items = useLayoutStore.getState().items;
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      startRef.current = {
        clientX,
        clientY,
        x: item.position.x,
        y: item.position.y,
        w: item.position.w,
        h: item.position.h,
        handle,
      };

      const onMove = (ev: MouseEvent | TouchEvent) => handleResizeMove(ev);
      const onEnd = () => handleResizeEnd();
      handlersRef.current = { move: onMove, end: onEnd };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchend', onEnd);
    },
    [itemId, isStatic, handleResizeMove, handleResizeEnd]
  );

  return { handleResizeStart };
}
