# DashFlow State Architecture

Offline-first global state design for the Chrome New Tab dashboard.

---

## 1. Store Separation Proposal

| Store | Purpose | Persisted | Cloud Sync |
|-------|---------|-----------|------------|
| **layout** | Grid positions, dimensions, gaps | ✅ chrome.storage.local | Future |
| **widgets** | Widget instances, config, order | ✅ chrome.storage.local | Future |
| **settings** | User preferences, cloud sync flags | ✅ chrome.storage.local | Future |
| **ui** | Edit mode, active widget, modals | ❌ Ephemeral | No |

### Rationale

- **Layout** and **widgets** are split because layout is purely positional (grid lib concern) while widgets hold type + config. They reference each other via `layoutItem.widgetId` → `widgets.instances[id]`.
- **UI** stays in memory: edit state, drag state, modals should not survive a reload.
- **Settings** holds cross-cutting config (locale, grid defaults) and cloud sync metadata for future use.

---

## 2. TypeScript Interfaces

### Layout Store

```ts
interface LayoutState {
  items: LayoutItem[];
  cols: number;
  rowHeight: number;
  gap: [number, number];
  compactType: 'vertical' | 'horizontal' | null;
}

interface LayoutItem {
  id: string;           // layout item id (e.g. "layout-abc123")
  widgetId: string;     // references widgets.instances[id]
  position: { x, y, w, h };
  minW?, minH?, maxW?, maxH?, static?;
}
```

### Widgets Store

```ts
interface WidgetsState {
  instances: Record<string, WidgetInstance>;
  order: string[];      // z-order / display order
}

interface WidgetInstance {
  id: string;
  type: WidgetType;     // 'clock' | 'search' | 'quick-links' | ...
  config: WidgetConfig; // type-specific key-value
  version: number;      // for schema migration
}
```

### UI Store

```ts
interface UIState {
  isEditing: boolean;
  activeWidgetId: string | null;
  sidebarOpen: boolean;
  modalOpen: string | null;
  dragInProgress: boolean;
  theme: 'light' | 'dark' | 'system';
}
```

### Settings Store

```ts
interface SettingsState {
  cloudSync: {
    enabled: boolean;
    lastSyncAt: number | null;
    conflictResolution: 'local' | 'remote' | 'manual';
  };
  locale: string;
  grid: { cols: number; rowHeight: number };
  _syncVersion?: number;   // for cloud sync
  _lastModified?: number;
}
```

---

## 3. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Mount                                 │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  initializeStores()                                              │
│  1. loadPersistedState() → chrome.storage.local.get()            │
│  2. Hydrate: settings → layout → widgets                         │
│  3. Subscribe layout, widgets, settings → schedulePersist()      │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ Layout Store  │         │ Widgets Store │         │ UI Store      │
│ (persisted)   │◄───────►│ (persisted)   │         │ (ephemeral)   │
└───────┬───────┘         └───────┬───────┘         └───────────────┘
        │                         │
        │    layoutItem.widgetId ─┼─► widgets.instances[widgetId]
        │                         │
        ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  schedulePersist() [debounced 300ms]                             │
│  saveLayout() / saveWidgets() / saveSettings()                   │
│  → chrome.storage.local.set()                                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ chrome.storage.onChanged │  (future: sync service)
                    │ → push to cloud          │
                    └─────────────────────────┘
```

### Key flows

1. **Add widget**: `widgets.addWidget()` + `layout.addItem()` (both persisted).
2. **Remove widget**: `layout.removeItem()` + `widgets.removeWidget()`.
3. **Edit mode**: `ui.setEditing(true)` — no persistence.
4. **Grid resize**: `layout.updateItemPosition()` → debounced persist.

---

## 4. Store Initialization Example

```ts
// In App.tsx or main.tsx (before render)
import { initializeStores } from '@/stores';

async function bootstrap() {
  await initializeStores();
  // Now safe to render; stores are hydrated from chrome.storage.local
}

bootstrap().then(() => {
  ReactDOM.createRoot(root).render(<App />);
});
```

### Initialization order

1. **loadPersistedState()** — read layout, widgets, settings from storage.
2. **Settings** — hydrated first (layout grid may use settings.grid).
3. **Layout** — items + grid config.
4. **Widgets** — instances + order.
5. **Subscribe** — layout, widgets, settings → debounced persist.
6. **isInitialized = true** — enable persistence on subsequent changes.

---

## 5. Future Cloud Sync

- Add `settings.cloudSync.enabled` and `_syncVersion` / `_lastModified`.
- Sync service listens to `chrome.storage.onChanged` or polls.
- On conflict: use `conflictResolution` ('local' | 'remote' | 'manual').
- Sync runs only when `cloudSync.enabled` is true; offline-first preserved.
