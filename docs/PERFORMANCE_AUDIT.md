# DashFlow Performance Audit & Improvements

---

## 1. Performance Audit

### Issues Identified

| Area | Issue | Impact |
|------|-------|--------|
| **Re-renders** | DashboardGrid subscribes to whole layout store | Any layout change re-renders grid + all children |
| **Re-renders** | GridItem not memoized | All items re-render when any layout prop changes |
| **Re-renders** | toPixelPosition recreated every render | New function reference breaks memoization of GridItem |
| **Re-renders** | ResizeObserver callback fires frequently | Unnecessary setState on every resize event |
| **Mount cost** | All widgets mount immediately | Weather/Todo fetch on load even when off-screen |
| **IndexedDB** | New connection per operation | open/close overhead on each get/put |
| **IndexedDB** | Todo reorder: N separate updates | N transactions instead of 1 batched |

---

## 2. Implemented Improvements

### Memoization

```tsx
// DashboardGrid - selective store subscriptions
const useGridLayout = () => {
  const items = useLayoutStore((s) => s.items);
  const cols = useLayoutStore((s) => s.cols);
  const rowHeight = useLayoutStore((s) => s.rowHeight);
  const gap = useLayoutStore((s) => s.gap);
  return { items, cols, rowHeight, gap };
};

// Stable callbacks with useCallback
const toPixelPosition = useCallback(
  (x, y, w, h) => ({ left, top, width, height }),
  [colWidth, gapX, rowHeight, gapY]
);

// GridItem and WidgetRenderer wrapped in memo()
export const GridItem = memo(function GridItem(...) { ... });
export const WidgetRenderer = memo(function WidgetRenderer(...) { ... });
```

### ResizeObserver Throttling

```tsx
// Throttle via requestAnimationFrame
const onResize = () => {
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  rafRef.current = requestAnimationFrame(() => setContainerWidth(el.offsetWidth));
};
```

### Lazy Widget Loading

```tsx
// LazyWidgetSlot - IntersectionObserver defers mount until in viewport
const [inView, setInView] = useState(false);

useEffect(() => {
  const io = new IntersectionObserver(
    ([entry]) => { if (entry?.isIntersecting) setInView(true); },
    { rootMargin: '100px', threshold: 0.01 }
  );
  io.observe(containerRef.current);
  return () => io.disconnect();
}, []);

return inView ? <WidgetRenderer ... /> : <div className="min-h-[60px]" />;
```

### IndexedDB Optimization

```ts
// Connection reuse - single open, no close per transaction
let dbInstance: IDBDatabase | null = null;
export function openDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  // ... open once, cache
}

// Batch updates - single transaction for multiple puts
async updateMany(items: T[]): Promise<void> {
  await runTransaction(storeName, 'readwrite', async (stores) => {
    for (const item of items) await promisify(store.put(item));
  });
}
```

---

## 3. Additional Suggestions

### Future: Widget Code Splitting

```tsx
// Lazy register widget components
const ClockWidget = lazy(() => import('./plugins/clock'));
// Registry stores lazy component, WidgetRenderer uses <Suspense>
```

### Future: Zustand Shallow Compare

```ts
// For complex selectors, use shallow to prevent unnecessary rerenders
import { useShallow } from 'zustand/react/shallow';
const { items, cols } = useLayoutStore(useShallow((s) => ({ items: s.items, cols: s.cols })));
```

### Future: Virtualized Grid

For 20+ widgets, consider virtualizing off-screen items instead of lazy mount (e.g. react-window).
