# DashFlow Storage Strategy

Offline-first storage with chrome.storage.local and IndexedDB, designed for future cloud sync.

---

## 1. Data Categories and Storage Mapping

| Category | Storage | Rationale |
|----------|---------|-----------|
| **Layout** | chrome.storage.local | Small, frequently read on New Tab, sync-friendly |
| **Widget instances** | chrome.storage.local | Metadata only (id, type, config), small |
| **Settings** | chrome.storage.local | Small, user preferences |
| **Widget data** | IndexedDB | Notes content, todo items, bookmarks — can be large, structured, per-widget |

### chrome.storage.local (~5MB limit)

- Layout (grid positions, cols, gap)
- Widget instances (id, type, config per instance)
- Settings (locale, cloud sync flags, grid defaults)

### IndexedDB (large, unstructured limit)

- `widget:notes:{instanceId}` → note content
- `widget:todo:{instanceId}` → todo items array
- `widget:bookmarks:{instanceId}` → bookmark entries
- Future: weather cache, search history, etc.

---

## 2. Storage Abstraction Layer

```
                    ┌─────────────────────────┐
                    │    StorageManager       │
                    │  (routes by category)   │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
   │ ChromeStorage  │  │   IndexedDB    │  │  SyncAdapter   │
   │    Backend     │  │    Backend     │  │   (future)     │
   │ layout/widgets │  │  widget data   │  │  cloud push/   │
   │   settings     │  │                │  │  pull          │
   └────────────────┘  └────────────────┘  └────────────────┘
```

**Unified interface:**
```ts
interface StorageBackend {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  keys?(): Promise<string[]>;
}
```

---

## 3. Versioning and Migrations Strategy

### Schema Versions

| Data | Key | Version Field | Migration |
|------|-----|---------------|-----------|
| Layout | `dashflow:layout` | `payload.version` | `layout-schema.ts` migrations |
| Widgets | `dashflow:widgets` | (future) | Parse, validate, migrate |
| Settings | `dashflow:settings` | (future) | Hydrate with defaults |
| Widget data | `widget:{type}:{id}` | In value or meta | Per-widget migration |

### Migration Flow

1. **Load raw** → parse
2. **Check version** → if old, run migration chain
3. **Validate** → type guards, sanitize
4. **Return** or **null** (trigger defaults)

### Adding a Migration

1. Bump `SCHEMA_VERSION` constant
2. Add `migrations[newVersion] = (data) => migratedData`
3. Migration runs only when `storedVersion < currentVersion`

### Future Cloud Sync Compatibility

- **Sync metadata**: `_syncVersion`, `_lastModified` in settings
- **Conflict resolution**: settings.cloudSync.conflictResolution
- **Storage events**: `chrome.storage.onChanged` → trigger sync push
- **IndexedDB**: sync service reads/writes via same abstraction; cloud stores delta/blobs
- **Offline-first**: Always read from local; sync in background when online

---

## 5. Usage Examples

### UI data (chrome.storage.local)

```ts
import { storageAdapter } from '@/storage';

await storageAdapter.set('dashflow:layout', layoutPayload);
const layout = await storageAdapter.get('dashflow:layout');
```

### Widget data (IndexedDB)

```ts
import { storageManager, widgetDataKey } from '@/storage';

const key = widgetDataKey('notes', instanceId);
await storageManager.set(key, { content: '...', updatedAt: Date.now() });
const data = await storageManager.get(key);
```

### Via storageManager (auto-routes)

```ts
import { storageManager } from '@/storage';

// Goes to chrome.storage.local
await storageManager.set('dashflow:settings', settings);

// Goes to IndexedDB
await storageManager.set(widgetDataKey('todo', id), items);
```

---

## 4. Offline-First Flow

```
App load
    │
    ▼
Load from local (chrome.storage + IndexedDB)
    │
    ▼
Hydrate stores / render UI
    │
    ▼
User changes → Debounced write to local
    │
    ▼
[Future] On change → Queue sync job
    │
    ▼
[Future] When online → Push to cloud, pull updates, merge
```
