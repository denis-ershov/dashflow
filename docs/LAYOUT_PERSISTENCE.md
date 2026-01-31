# Layout Persistence

Layout state is saved to `chrome.storage.local` and restored when the New Tab opens.

---

## 1. Storage Adapter

**`src/storage/adapter.ts`**

```ts
interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  getMany<T>(keys: string[]): Promise<Partial<T>>;
}

const storageAdapter = createStorageAdapter('local');
```

- Abstracts `chrome.storage.local`
- Returns `null` on get failure (corrupted/unavailable)
- Logs warnings on errors

---

## 2. Save / Load Logic

**`src/stores/persistence.ts`**

| Function | Purpose |
|----------|---------|
| `loadLayout()` | Load raw → parse → validate → return `LayoutState \| null` |
| `loadPersistedState()` | Load layout + widgets + settings in parallel |
| `saveLayout(layout)` | Serialize with version → write to storage |

**Flow:**
1. **Restore (New Tab open):** `loadPersistedState()` → `parseLayout(raw)` → hydrate stores
2. **Save (on change):** Debounced 300ms → `serializeLayout(layout)` → `storageAdapter.set()`

---

## 3. Type-Safe Schema

**`src/storage/layout-schema.ts`**

```ts
export const LAYOUT_SCHEMA_VERSION = 1;

export interface VersionedLayoutPayload {
  version: number;
  data: LayoutState;
}

// Stored format
{ version: 1, data: { items, cols, rowHeight, gap, compactType } }
```

**Runtime validation:**
- `isLayoutItem`, `isLayoutState` – type guards
- `parseLayout(raw)` – returns `LayoutState | null` (null if invalid)
- `serializeLayout(layout)` – wraps in `VersionedLayoutPayload`

**Sanitization:**
- Clamp cols (1–24), rowHeight (20–200), gap (≥0)
- Clamp item positions and min/max dimensions

---

## 4. Corrupted / Outdated Handling

| Case | Behavior |
|------|----------|
| `null` / missing | Return `null` → init seeds default |
| Invalid JSON | Adapter returns `null` |
| Wrong shape | `parseLayout` returns `null` |
| Legacy (unversioned) | Treated as v1, sanitized |
| Future version | Warning, attempt to use as-is |
| Old version | Migrated via `migrate(fromVersion, data)` |

---

## 5. Schema Migrations

Add migrations when the schema changes:

```ts
// layout-schema.ts
const migrations: Record<number, (data: unknown) => LayoutState> = {
  1: (data) => sanitizeLayout(data as LayoutState),
  // Future: 2: (data) => migrateV1toV2(data),
};
```

1. Bump `LAYOUT_SCHEMA_VERSION`
2. Add a migration for the new version
3. Old payloads are migrated on load

---

## 6. Integration with Layout Store

**`src/stores/init.ts`**

```ts
// Load
const persisted = await loadPersistedState();
if (persisted.layout) {
  useLayoutStore.getState().setLayout(persisted.layout.items);
  useLayoutStore.getState().setGridConfig({ cols, rowHeight, gap, compactType });
}

// Subscribe (debounced save on change)
useLayoutStore.subscribe(() => schedulePersist());
```

`schedulePersist` reads the current layout from the store, serializes it, and calls `saveLayout()`.
