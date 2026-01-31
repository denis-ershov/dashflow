# Widget Rendering Engine

Renders widgets from layout state with registry lookup, instance config, and error handling.

---

## 1. WidgetRenderer Component

**`src/widgets/WidgetRenderer.tsx`**

```tsx
<WidgetRenderer
  type={widget.type}      // Registry key
  instanceId={widget.id}  // Unique instance id
  config={widget.config}  // Instance-specific settings
/>
```

**Flow:**
1. Look up `type` in registry
2. If missing → `PlaceholderWidget` (reason: "missing")
3. If component invalid → `PlaceholderWidget` (reason: "invalid")
4. Otherwise → wrap in `WidgetErrorBoundary` → render component with `config`

---

## 2. Error Boundary Strategy

**`src/widgets/WidgetErrorBoundary.tsx`**

- Catches render errors and lifecycle errors in widget components
- Resets when `type` or `instanceId` changes (e.g. layout update)
- Renders `WidgetErrorFallback` on error (or custom `fallback` prop)
- Optional `onError` callback for logging
- In dev: logs to console, shows error message in fallback UI

**Error fallback UI:**
- Warning icon, "Widget error" label
- Widget type and instance id
- Error message (dev only)

**Usage:**
```tsx
<WidgetErrorBoundary
  type="clock"
  instanceId="abc-123"
  onError={(err, info) => logToService(err, info)}
  fallback={<CustomFallback />}  // optional
>
  <ClockComponent ... />
</WidgetErrorBoundary>
```

---

## 3. Rendering Flow

```
Layout state (items)
       │
       ▼
  DashboardGrid
       │
       ▼
  GridItem (per layout item)
       │
       ├─► WidgetSlot
       │       │
       │       ├─ Lookup: useWidgetsStore().instances[item.widgetId]
       │       │
       │       └─► WidgetRenderer
       │               │
       │               ├─ getWidget(type)
       │               │     │
       │               │     ├─ null → PlaceholderWidget (missing)
       │               │     │
       │               │     └─ definition
       │               │           │
       │               │           ├─ invalid component → PlaceholderWidget (invalid)
       │               │           │
       │               │           └─ WidgetErrorBoundary
       │               │                 │
       │               │                 ├─ error → WidgetErrorFallback
       │               │                 │
       │               │                 └─ Component(instanceId, config)
       │               │
       │               └─ Instance not in store → "Unknown widget"
       │
       └─ (drag/resize UI)
```

**Fallbacks:**
| Case | Result |
|------|--------|
| Instance not in store | "Unknown widget" (WidgetSlot) |
| Type not in registry | PlaceholderWidget (missing) |
| Invalid component | PlaceholderWidget (invalid) |
| Widget throws | WidgetErrorFallback (error boundary) |

---

## 4. Example: End-to-End

```tsx
// 1. Layout state
const items = [
  { id: 'layout-1', widgetId: 'inst-1', position: { x: 0, y: 0, w: 4, h: 2 } }
];

// 2. Widget instance
const instances = {
  'inst-1': { id: 'inst-1', type: 'clock', config: { showSeconds: true } }
};

// 3. GridItem renders WidgetSlot with widgetId="inst-1"
// 4. WidgetSlot looks up instances['inst-1'] → { type: 'clock', config: {...} }
// 5. WidgetRenderer receives type="clock", instanceId="inst-1", config={...}
// 6. Registry returns Clock definition
// 7. WidgetErrorBoundary wraps <ClockComponent instanceId="inst-1" config={...} />
// 8. Clock renders; if it throws, ErrorBoundary catches and shows WidgetErrorFallback
```
