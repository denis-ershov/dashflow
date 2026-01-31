import type { LayoutState, LayoutItem, GridPosition } from '@/types/dashboard';

/**
 * Layout schema versioning for migrations.
 * Increment LAYOUT_SCHEMA_VERSION when layout structure changes.
 */
export const LAYOUT_SCHEMA_VERSION = 1;

export interface VersionedLayoutPayload {
  version: number;
  data: LayoutState;
}

// =============================================================================
// RUNTIME VALIDATION (type guards)
// =============================================================================

function isGridPosition(x: unknown): x is GridPosition {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    typeof p.w === 'number' &&
    typeof p.h === 'number' &&
    p.w >= 1 &&
    p.h >= 1
  );
}

function isLayoutItem(x: unknown): x is LayoutItem {
  if (!x || typeof x !== 'object') return false;
  const i = x as Record<string, unknown>;
  if (typeof i.id !== 'string' || typeof i.widgetId !== 'string') return false;
  if (!isGridPosition(i.position)) return false;
  if (i.minW !== undefined && typeof i.minW !== 'number') return false;
  if (i.minH !== undefined && typeof i.minH !== 'number') return false;
  if (i.maxW !== undefined && typeof i.maxW !== 'number') return false;
  if (i.maxH !== undefined && typeof i.maxH !== 'number') return false;
  if (i.static !== undefined && typeof i.static !== 'boolean') return false;
  return true;
}

function isLayoutState(x: unknown): x is LayoutState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  if (!Array.isArray(s.items)) return false;
  if (!s.items.every(isLayoutItem)) return false;
  if (typeof s.cols !== 'number' || s.cols < 1 || s.cols > 24) return false;
  if (typeof s.rowHeight !== 'number' || s.rowHeight < 20 || s.rowHeight > 200)
    return false;
  if (!Array.isArray(s.gap) || s.gap.length !== 2) return false;
  if (s.gap.some((g: unknown) => typeof g !== 'number')) return false;
  if (
    s.compactType !== null &&
    s.compactType !== 'vertical' &&
    s.compactType !== 'horizontal'
  )
    return false;
  return true;
}

function isVersionedPayload(x: unknown): x is VersionedLayoutPayload {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.version === 'number' &&
    v.version >= 1 &&
    v.data !== undefined &&
    isLayoutState(v.data)
  );
}

// =============================================================================
// LEGACY / RAW FORMAT (unversioned layout stored directly)
// =============================================================================

function isLegacyLayout(x: unknown): x is LayoutState {
  return isLayoutState(x);
}

// =============================================================================
// NORMALIZE & SANITIZE
// =============================================================================

function sanitizePosition(p: GridPosition, cols: number): GridPosition {
  return {
    x: Math.max(0, Math.min(cols - 1, Math.round(p.x))),
    y: Math.max(0, Math.round(p.y)),
    w: Math.max(1, Math.min(cols, Math.round(p.w))),
    h: Math.max(1, Math.round(p.h)),
  };
}

function sanitizeItem(item: LayoutItem, cols: number): LayoutItem {
  const position = sanitizePosition(item.position, cols);
  return {
    ...item,
    position,
    minW: item.minW != null ? Math.max(1, item.minW) : undefined,
    minH: item.minH != null ? Math.max(1, item.minH) : undefined,
    maxW: item.maxW != null ? Math.min(cols, item.maxW) : undefined,
    maxH: item.maxH != null ? Math.max(1, item.maxH) : undefined,
  };
}

function sanitizeLayout(raw: LayoutState): LayoutState {
  const cols = Math.max(1, Math.min(24, Math.round(raw.cols)));
  const rowHeight = Math.max(20, Math.min(200, Math.round(raw.rowHeight)));
  const gap: [number, number] = [
    Math.max(0, Math.round(Array.isArray(raw.gap) ? raw.gap[0] : 16)),
    Math.max(0, Math.round(Array.isArray(raw.gap) ? raw.gap[1] : 16)),
  ];
  const compactType =
    raw.compactType === 'vertical' || raw.compactType === 'horizontal'
      ? raw.compactType
      : null;

  const items = Array.isArray(raw.items)
    ? raw.items.filter(isLayoutItem).map((i) => sanitizeItem(i, cols))
    : [];

  return { items, cols, rowHeight, gap, compactType };
}

// =============================================================================
// MIGRATIONS
// =============================================================================

const migrations: Record<number, (data: unknown) => LayoutState> = {
  1: (data) => sanitizeLayout(data as LayoutState),
};

function migrate(fromVersion: number, data: unknown): LayoutState {
  let current = data;
  for (let v = fromVersion; v < LAYOUT_SCHEMA_VERSION; v++) {
    const fn = migrations[v + 1];
    if (fn) current = fn(current);
  }
  return current as LayoutState;
}

// =============================================================================
// PUBLIC API
// =============================================================================

export function parseLayout(raw: unknown): LayoutState | null {
  if (raw === null || raw === undefined) return null;

  // Versioned format
  if (isVersionedPayload(raw)) {
    if (raw.version > LAYOUT_SCHEMA_VERSION) {
      console.warn(
        '[DashFlow] Layout schema from future version, attempting to use as-is'
      );
    }
    if (raw.version < LAYOUT_SCHEMA_VERSION) {
      return migrate(raw.version, raw.data);
    }
    return sanitizeLayout(raw.data);
  }

  // Legacy unversioned format
  if (isLegacyLayout(raw)) {
    return sanitizeLayout(raw);
  }

  console.warn('[DashFlow] Invalid layout data, ignoring');
  return null;
}

export function serializeLayout(layout: LayoutState): VersionedLayoutPayload {
  return {
    version: LAYOUT_SCHEMA_VERSION,
    data: layout,
  };
}
