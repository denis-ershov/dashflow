/**
 * DashFlow Layout Engine
 * Lightweight grid layout: collision detection, compaction, placement.
 * No external dependencies.
 */

import type { LayoutItem, GridPosition } from '@/types/dashboard';

// =============================================================================
// COLLISION DETECTION
// =============================================================================

export function collides(a: GridPosition, b: GridPosition): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function getCollisions(
  item: LayoutItem,
  items: LayoutItem[],
  excludeId?: string
): LayoutItem[] {
  return items.filter(
    (other) =>
      other.id !== excludeId &&
      other.id !== item.id &&
      collides(item.position, other.position)
  );
}

export function hasCollision(
  item: LayoutItem,
  items: LayoutItem[],
  excludeId?: string
): boolean {
  return getCollisions(item, items, excludeId).length > 0;
}

// =============================================================================
// BOUNDS & SNAP
// =============================================================================

export function clampPosition(
  position: GridPosition,
  cols: number,
  minW = 1,
  minH = 1,
  maxW?: number,
  maxH?: number
): GridPosition {
  const w = Math.min(
    Math.max(Math.round(position.w), minW),
    maxW ?? cols - position.x,
    cols
  );
  const h = Math.max(Math.round(position.h), minH);
  const x = Math.min(Math.max(Math.round(position.x), 0), cols - w);
  const y = Math.max(Math.round(position.y), 0);

  return { x, y, w, h };
}

export function snapToGrid(position: GridPosition): GridPosition {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
    w: Math.round(position.w),
    h: Math.round(position.h),
  };
}

// =============================================================================
// COMPACTION (vertical flow - items move up to fill gaps)
// =============================================================================

function sortByRowCol(items: LayoutItem[], compactType: 'vertical' | 'horizontal' | null): LayoutItem[] {
  if (compactType === 'horizontal') {
    return [...items].sort((a, b) => {
      if (a.position.y !== b.position.y) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });
  }
  // vertical (default)
  return [...items].sort((a, b) => {
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.position.x - b.position.x;
  });
}

export function compact(
  items: LayoutItem[],
  cols: number,
  compactType: 'vertical' | 'horizontal' | null = 'vertical'
): LayoutItem[] {
  const sorted = sortByRowCol(items, compactType);
  const result: LayoutItem[] = [];

  for (const item of sorted) {
    if (item.static) {
      result.push(item);
      continue;
    }

    let { x, y, w, h } = item.position;
    const minY = 0;

    while (y >= minY) {
      let collided = false;
      const testPos = { x, y, w, h };

      for (const other of result) {
        if (collides(testPos, other.position)) {
          collided = true;
          if (compactType === 'vertical') {
            y = other.position.y + other.position.h;
          } else {
            x = other.position.x + other.position.w;
          }
          break;
        }
      }

      if (!collided) break;
    }

    // Clamp to grid bounds
    x = Math.min(Math.max(x, 0), cols - w);
    y = Math.max(y, 0);

    result.push({
      ...item,
      position: { ...item.position, x, y },
    });
  }

  return result;
}

// =============================================================================
// PLACEMENT - Find first available slot
// =============================================================================

export function getNextPosition(
  items: LayoutItem[],
  cols: number,
  w: number,
  h: number
): GridPosition {
  const probe: LayoutItem = {
    id: '__probe__',
    widgetId: '__probe__',
    position: { x: 0, y: 0, w, h },
  };

  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= cols - w; x++) {
      probe.position = { x, y, w, h };
      if (!hasCollision(probe, items)) {
        return { x, y, w, h };
      }
    }
  }
  return { x: 0, y: items.length > 0 ? 100 : 0, w, h };
}

// =============================================================================
// RESOLVE - Push items down when placing at a position
// =============================================================================

export function resolveCollisions(
  item: LayoutItem,
  items: LayoutItem[],
  cols: number
): LayoutItem[] {
  let result = items.map((i) =>
    i.id === item.id ? item : { ...i, position: { ...i.position } }
  );

  let changed = true;
  let iterations = 0;
  const maxIterations = 100;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (let i = 0; i < result.length; i++) {
      const current = result[i];
      if (current.id === item.id) continue;
      if (current.static) continue;

      const collisions = getCollisions(current, result, current.id);
      for (const other of collisions) {
        const otherBottom = other.position.y + other.position.h;
        const newY = otherBottom;
        if (newY !== current.position.y) {
          result[i] = {
            ...current,
            position: { ...current.position, y: newY },
          };
          changed = true;
        }
      }
    }
  }

  return compact(result, cols);
}
