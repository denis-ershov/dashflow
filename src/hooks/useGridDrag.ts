import { useCallback, useRef } from 'react';
import type { GridPosition } from '@/types/dashboard';
import { useLayoutStore } from '@/stores';
import { collides } from '@/lib/layout-engine';

interface UseGridDragOptions {
  itemId: string;
  cols: number;
  rowHeight: number;
  gap: [number, number];
  static?: boolean;
}

export function useGridDrag({
  itemId,
  cols,
  rowHeight,
  gap,
  static: isStatic,
}: UseGridDragOptions) {
  const startRef = useRef<{ x: number; y: number; gridX: number; gridY: number } | null>(null);
  const handlersRef = useRef<{ move: (e: MouseEvent | TouchEvent) => void; end: () => void } | null>(null);

  const handleDragEnd = useCallback(() => {
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

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!startRef.current) return;
      e.preventDefault();
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0]?.clientX ?? (e as MouseEvent).clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0]?.clientY ?? (e as MouseEvent).clientY : (e as MouseEvent).clientY;

      const colWidth = (window.innerWidth - (cols + 1) * gap[0]) / cols;
      const deltaGridX = (clientX - startRef.current.x) / (colWidth + gap[0]);
      const deltaGridY = (clientY - startRef.current.y) / (rowHeight + gap[1]);

      let newX = Math.round(startRef.current.gridX + deltaGridX);
      let newY = Math.round(startRef.current.gridY + deltaGridY);

      const items = useLayoutStore.getState().items;
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const { w, h } = item.position;
      newX = Math.max(0, Math.min(cols - w, newX));
      newY = Math.max(0, newY);

      const testPos: GridPosition = { x: newX, y: newY, w, h };
      const others = items.filter((i) => i.id !== itemId);
      const collision = others.some((o) => collides(testPos, o.position));

      if (!collision) {
        useLayoutStore.getState().updateItemPosition(itemId, { x: newX, y: newY });
        startRef.current = { ...startRef.current, gridX: newX, gridY: newY };
      }
    },
    [itemId, cols, rowHeight, gap]
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isStatic) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const items = useLayoutStore.getState().items;
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      startRef.current = {
        x: clientX,
        y: clientY,
        gridX: item.position.x,
        gridY: item.position.y,
      };

      const onMove = (ev: MouseEvent | TouchEvent) => handleDragMove(ev);
      const onEnd = () => handleDragEnd();
      handlersRef.current = { move: onMove, end: onEnd };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchend', onEnd);
    },
    [itemId, isStatic, handleDragMove, handleDragEnd]
  );

  return { handleDragStart };
}
