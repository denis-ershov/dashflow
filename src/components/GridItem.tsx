import { memo } from 'react';
import type { LayoutItem } from '@/types/dashboard';
import { useGridDrag } from '@/hooks/useGridDrag';
import { useGridResize, type ResizeHandle } from '@/hooks/useGridResize';
import { useUIStore } from '@/stores';
import { LazyWidgetSlot } from './LazyWidgetSlot';

interface GridItemProps {
  item: LayoutItem;
  cols: number;
  colWidth: number;
  rowHeight: number;
  gap: [number, number];
  toPixelPosition: (x: number, y: number, w: number, h: number) => {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

const RESIZE_HANDLES: ResizeHandle[] = ['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's'];

export const GridItem = memo(function GridItem({
  item,
  cols,
  colWidth,
  rowHeight,
  gap,
  toPixelPosition,
}: GridItemProps) {
  const isEditing = useUIStore((s) => s.isEditing);

  const { handleDragStart } = useGridDrag({
    itemId: item.id,
    cols,
    rowHeight,
    gap,
    static: item.static || !isEditing,
  });

  const { handleResizeStart } = useGridResize({
    itemId: item.id,
    cols,
    rowHeight,
    gap,
    minW: item.minW ?? 1,
    minH: item.minH ?? 1,
    maxW: item.maxW,
    maxH: item.maxH,
    static: item.static || !isEditing,
  });

  const { x, y, w, h } = item.position;
  const { left, top, width, height } = toPixelPosition(x, y, w, h);

  return (
    <div
      className="absolute transition-shadow rounded-xl overflow-hidden bg-slate-900/80 border border-slate-700/50"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Drag handle - top bar when editing */}
      {isEditing && !item.static && (
        <div
          className="absolute inset-x-0 top-0 h-6 bg-slate-700/60 cursor-grab active:cursor-grabbing flex items-center justify-center z-10"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <span className="text-[10px] text-slate-400 font-medium">⋮⋮</span>
        </div>
      )}

      {/* Widget content slot - lazy loads when in viewport */}
      <div
        className="w-full h-full overflow-auto"
        style={{ paddingTop: isEditing && !item.static ? 24 : 12 }}
      >
        <LazyWidgetSlot widgetId={item.widgetId} />
      </div>

      {/* Resize handles when editing */}
      {isEditing && !item.static &&
        RESIZE_HANDLES.map((handle) => {
          const isCorner = handle.length === 2;
          const baseClass = 'absolute bg-slate-500/80 rounded-sm hover:bg-slate-400';
          const sizeClass = isCorner ? 'w-2 h-2' : handle === 'n' || handle === 's' ? 'h-2 w-6' : 'w-2 h-6';
          const pos: Record<string, string | number> = {};
          if (handle.includes('s')) pos.bottom = 4;
          if (handle.includes('n')) pos.top = 28;
          if (handle.includes('e')) pos.right = 4;
          if (handle.includes('w')) pos.left = 4;
          if ((handle === 'n' || handle === 's') && !isCorner) {
            pos.left = '50%';
            pos.transform = 'translateX(-50%)';
          }
          if ((handle === 'e' || handle === 'w') && !isCorner) {
            pos.top = '50%';
            pos.transform = 'translateY(-50%)';
          }
          return (
            <div
              key={handle}
              className={`${baseClass} ${sizeClass}`}
              style={{ cursor: `${handle}-resize`, ...pos }}
              onMouseDown={(e) => handleResizeStart(e, handle)}
              onTouchStart={(e) => handleResizeStart(e, handle)}
            />
          );
        })}
    </div>
  );
});

