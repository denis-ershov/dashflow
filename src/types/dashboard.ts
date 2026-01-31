/**
 * DashFlow - Global State Type Definitions
 * Offline-first, cloud-sync-ready architecture
 */

// =============================================================================
// LAYOUT STORE
// =============================================================================

export type GridUnit = number; // 1 unit = typically 60px

export interface GridPosition {
  x: GridUnit;
  y: GridUnit;
  w: GridUnit;
  h: GridUnit;
}

export interface LayoutItem {
  id: string;
  widgetId: string;
  position: GridPosition;
  minW?: GridUnit;
  minH?: GridUnit;
  maxW?: GridUnit;
  maxH?: GridUnit;
  static?: boolean;
}

export interface LayoutState {
  items: LayoutItem[];
  cols: number;
  rowHeight: number;
  gap: [number, number];
  compactType: 'vertical' | 'horizontal' | null;
}

// =============================================================================
// WIDGETS STORE
// =============================================================================

export type WidgetType =
  | 'clock'
  | 'search'
  | 'quick-links'
  | 'notes'
  | 'weather'
  | 'todo'
  | 'bookmarks'
  | 'custom';

export interface WidgetConfig {
  [key: string]: unknown;
}

export interface WidgetInstance {
  id: string;
  /** Widget type (registry key) - built-in or plugin */
  type: string;
  config: WidgetConfig;
  version: number; // for migration when schema changes
}

export interface WidgetsState {
  instances: Record<string, WidgetInstance>;
  order: string[]; // display order / z-index hint
}

// =============================================================================
// UI STORE (ephemeral - not persisted)
// =============================================================================

export interface UIState {
  isEditing: boolean;
  activeWidgetId: string | null;
  sidebarOpen: boolean;
  modalOpen: string | null;
  dragInProgress: boolean;
}

// =============================================================================
// SETTINGS STORE
// =============================================================================

export interface CloudSyncSettings {
  enabled: boolean;
  lastSyncAt: number | null;
  conflictResolution: 'local' | 'remote' | 'manual';
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeOverrides {
  /** CSS color value (e.g. hex, hsl) */
  primary?: string;
  background?: string;
  surface?: string;
  text?: string;
  textMuted?: string;
  border?: string;
}

export interface SettingsState {
  cloudSync: CloudSyncSettings;
  locale: string;
  theme: ThemeMode;
  themeOverrides?: ThemeOverrides;
  grid: {
    cols: number;
    rowHeight: number;
  };
  // Reserved for future cloud sync
  _syncVersion?: number;
  _lastModified?: number;
}

// =============================================================================
// PERSISTENCE KEYS (for chrome.storage.local)
// =============================================================================

export const STORAGE_KEYS = {
  LAYOUT: 'dashflow:layout',
  WIDGETS: 'dashflow:widgets',
  SETTINGS: 'dashflow:settings',
} as const;

// =============================================================================
// COMBINED STATE (for selectors / serialization)
// =============================================================================

export interface PersistedState {
  layout: LayoutState;
  widgets: WidgetsState;
  settings: SettingsState;
}
