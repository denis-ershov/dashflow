/**
 * DashFlow Store Initialization
 *
 * Data flow:
 * 1. On load: Load from chrome.storage.local → Hydrate stores (offline-first)
 * 2. On change: Store updates → Debounced persistence to chrome.storage.local
 * 3. Future: Sync service listens to storage changes → Push/pull from cloud when enabled
 */

import { useLayoutStore } from './layout.store';
import { useWidgetsStore } from './widgets.store';
import { useSettingsStore } from './settings.store';
import { loadPersistedState, saveLayout, saveWidgets, saveSettings } from './persistence';

let persistTimeout: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;
const PERSIST_DEBOUNCE_MS = 300;

function schedulePersist(): void {
  if (!isInitialized) return;
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    persistTimeout = null;
    const layout = useLayoutStore.getState();
    const widgets = useWidgetsStore.getState();
    const settings = useSettingsStore.getState();

    const { items, cols, rowHeight, gap, compactType } = layout;
    const { instances, order } = widgets;

    saveLayout({ items, cols, rowHeight, gap, compactType });
    saveWidgets({ instances, order });
    saveSettings({
      cloudSync: settings.cloudSync,
      locale: settings.locale,
      theme: settings.theme,
      themeOverrides: settings.themeOverrides,
      grid: settings.grid,
      _lastModified: Date.now(),
      _syncVersion: (settings._syncVersion ?? 0) + 1,
    });
  }, PERSIST_DEBOUNCE_MS);
}

export async function initializeStores(): Promise<void> {
  const persisted = await loadPersistedState();

  // 1. Settings first (layout grid config may depend on it)
  if (persisted.settings) {
    useSettingsStore.getState().hydrate(persisted.settings);
  }

  // 2. Layout (restore on New Tab open; parseLayout handles corrupted/outdated data)
  if (persisted.layout) {
    useLayoutStore.getState().setLayout(persisted.layout.items);
    useLayoutStore.getState().setGridConfig({
      cols: persisted.layout.cols,
      rowHeight: persisted.layout.rowHeight,
      gap: persisted.layout.gap,
      compactType: persisted.layout.compactType,
    });
  }

  // 3. Widgets
  const hasWidgets = persisted.widgets && Object.keys(persisted.widgets.instances).length > 0;
  const hasLayout = persisted.layout && persisted.layout.items.length > 0;

  if (hasWidgets) {
    useWidgetsStore.getState().setInstances(persisted.widgets!.instances);
    useWidgetsStore.getState().setWidgetOrder(persisted.widgets!.order);
  }

  if (!hasWidgets && !hasLayout) {
    // Seed default layout with a clock widget (first run)
    const defaultWidgetId = `widget-${crypto.randomUUID()}`;
    const defaultLayoutId = `layout-${crypto.randomUUID()}`;
    useWidgetsStore.getState().addWidget({
      id: defaultWidgetId,
      type: 'clock',
      config: {},
      version: 1,
    });
    useLayoutStore.getState().addItem({
      id: defaultLayoutId,
      widgetId: defaultWidgetId,
      position: { x: 0, y: 0, w: 4, h: 2 },
    });
  }

  // Subscribe stores to persistence (only persisted stores)
  useLayoutStore.subscribe(() => schedulePersist());
  useWidgetsStore.subscribe(() => schedulePersist());
  useSettingsStore.subscribe(() => schedulePersist());

  isInitialized = true;

  // Persist initial/seed state
  schedulePersist();
}
