import type { DashboardSnapshot } from '@/core/storage';

const CACHE_KEY = 'dashflow_startup_layout_v1';
const CACHE_VERSION = 1;
const MAX_WIDGETS = 40;
const MAX_ROWS = 32;
const MAX_CACHE_LENGTH = 4_096;
const CACHE_COLUMNS = 12;
const modes = new Set(['modular', 'canvas', 'zen']);

export interface StartupLayoutCache {
  version: 1;
  mode: 'modular' | 'canvas' | 'zen';
  widgetCount: number;
  geometry: Array<{ x: number; y: number; w: number; h: number }>;
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? (value as Record<string, unknown>)
    : undefined;
}

function validKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function boundedInteger(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
    ? value
    : undefined;
}

function normalizeMode(value: unknown): StartupLayoutCache['mode'] | undefined {
  return typeof value === 'string' && modes.has(value)
    ? (value as StartupLayoutCache['mode'])
    : undefined;
}

export function createStartupLayoutCache(snapshot: DashboardSnapshot): StartupLayoutCache | null {
  const activeSpace = snapshot.spaces.find(({ id }) => id === snapshot.activeSpaceId);
  if (!activeSpace || !Array.isArray(activeSpace.instances)) return null;
  const mode = normalizeMode(activeSpace.layoutMode ?? snapshot.layoutMode);
  if (!mode) return null;

  const count = Math.min(activeSpace.instances.length, MAX_WIDGETS);
  const columns = activeSpace.baseColumns;
  if (columns !== 12 && columns !== 16 && columns !== 24) return null;
  const positions = Array.isArray(activeSpace.layouts.xl) ? activeSpace.layouts.xl : [];
  const geometry = positions.slice(0, count).flatMap((position) => {
    const x = boundedInteger(position.x, 0, columns - 1);
    const y = boundedInteger(position.y, 0, 10_000);
    const w = boundedInteger(position.w, 1, columns);
    const h = boundedInteger(position.h, 1, 12);
    if (
      x === undefined ||
      y === undefined ||
      w === undefined ||
      h === undefined ||
      x + w > columns
    ) {
      return [];
    }
    const normalizedX = Math.min(CACHE_COLUMNS - 1, Math.round((x / columns) * CACHE_COLUMNS));
    const normalizedW = Math.max(1, Math.round((w / columns) * CACHE_COLUMNS));
    return [
      {
        x: normalizedX,
        y: Math.min(MAX_ROWS, y),
        w: Math.min(normalizedW, CACHE_COLUMNS - normalizedX),
        h: Math.min(12, h),
      },
    ];
  });
  if (geometry.length !== count) return null;
  return { version: CACHE_VERSION, mode, widgetCount: count, geometry };
}

export function parseStartupLayoutCache(value: unknown): StartupLayoutCache | null {
  const raw = record(value);
  if (
    !raw ||
    !validKeys(raw, ['version', 'mode', 'widgetCount', 'geometry']) ||
    raw.version !== CACHE_VERSION ||
    !Array.isArray(raw.geometry)
  ) {
    return null;
  }
  const mode = normalizeMode(raw.mode);
  const widgetCount = boundedInteger(raw.widgetCount, 0, MAX_WIDGETS);
  if (!mode || widgetCount === undefined || raw.geometry.length > MAX_WIDGETS) return null;
  const geometry = raw.geometry.flatMap((value) => {
    const item = record(value);
    if (!item || !validKeys(item, ['x', 'y', 'w', 'h'])) return [];
    const x = boundedInteger(item.x, 0, CACHE_COLUMNS - 1);
    const y = boundedInteger(item.y, 0, MAX_ROWS);
    const w = boundedInteger(item.w, 1, CACHE_COLUMNS);
    const h = boundedInteger(item.h, 1, 12);
    if (
      x === undefined ||
      y === undefined ||
      w === undefined ||
      h === undefined ||
      x + w > CACHE_COLUMNS
    ) {
      return [];
    }
    return [{ x, y, w, h }];
  });
  if (geometry.length !== raw.geometry.length || geometry.length !== widgetCount) return null;
  return { version: CACHE_VERSION, mode, widgetCount, geometry };
}

export function readStartupLayoutCache(storage?: Storage): StartupLayoutCache | null {
  try {
    const source = storage ?? globalThis.localStorage;
    const serialized = source.getItem(CACHE_KEY);
    if (!serialized || serialized.length > MAX_CACHE_LENGTH) return null;
    return parseStartupLayoutCache(JSON.parse(serialized) as unknown);
  } catch {
    return null;
  }
}

export function writeStartupLayoutCache(snapshot: DashboardSnapshot, storage?: Storage): void {
  try {
    const cache = createStartupLayoutCache(snapshot);
    if (!cache) return;
    const serialized = JSON.stringify(cache);
    if (serialized.length > MAX_CACHE_LENGTH) return;
    (storage ?? globalThis.localStorage).setItem(CACHE_KEY, serialized);
  } catch {
    // The cache is optional and must never block dashboard startup or persistence.
  }
}
