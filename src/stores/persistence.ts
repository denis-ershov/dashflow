import { STORAGE_KEYS } from '@/types/dashboard';
import type { LayoutState, WidgetsState, SettingsState } from '@/types/dashboard';
import { storageAdapter } from '@/storage';
import { parseLayout, serializeLayout } from '@/storage/layout-schema';

/**
 * Layout persistence with chrome.storage.local.
 * - Versioned schema for migrations
 * - Graceful handling of corrupted/outdated data
 * - Restores on New Tab open via initializeStores()
 */

// =============================================================================
// LOAD
// =============================================================================

export async function loadLayout(): Promise<LayoutState | null> {
  const raw = await storageAdapter.get<unknown>(STORAGE_KEYS.LAYOUT);
  return parseLayout(raw);
}

export async function loadWidgets(): Promise<WidgetsState | null> {
  const raw = await storageAdapter.get<WidgetsState>(STORAGE_KEYS.WIDGETS);
  if (!raw || typeof raw !== 'object') return null;
  if (!('instances' in raw) || !('order' in raw)) return null;
  const instances = raw.instances;
  const order = raw.order;
  if (typeof instances !== 'object' || !Array.isArray(order)) return null;
  return { instances, order };
}

export async function loadSettings(): Promise<SettingsState | null> {
  const raw = await storageAdapter.get<SettingsState>(STORAGE_KEYS.SETTINGS);
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.cloudSync || !raw.locale || !raw.grid) return null;
  if (raw.theme && !['light', 'dark', 'system'].includes(raw.theme)) {
    raw = { ...raw, theme: 'system' };
  }
  return raw;
}

export async function loadPersistedState(): Promise<{
  layout: LayoutState | null;
  widgets: WidgetsState | null;
  settings: SettingsState | null;
}> {
  const [layout, widgets, settings] = await Promise.all([
    loadLayout(),
    loadWidgets(),
    loadSettings(),
  ]);
  return { layout, widgets, settings };
}

// =============================================================================
// SAVE
// =============================================================================

export async function saveLayout(layout: LayoutState): Promise<void> {
  const payload = serializeLayout(layout);
  await storageAdapter.set(STORAGE_KEYS.LAYOUT, payload);
}

export async function saveWidgets(widgets: WidgetsState): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.WIDGETS, widgets);
}

export async function saveSettings(settings: SettingsState): Promise<void> {
  await storageAdapter.set(STORAGE_KEYS.SETTINGS, settings);
}
