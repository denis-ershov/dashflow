# DashFlow Grid Layout Engine

Custom lightweight grid layout for the Chrome New Tab dashboard. No external grid libraries.

---

## 1. Data Model for Layout Items

```ts
interface GridPosition {
  x: number;  // grid column (0-based)
  y: number;  // grid row (0-based)
  w: number;  // width in grid units
  h: number;  // height in grid units
}

interface LayoutItem {
  id: string;
  widgetId: string;       // references widgets.instances[id]
  position: GridPosition;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;       // if true, no drag/resize
}
```

- All coordinates are in **grid units** (snap-to-grid by design).
- `cols` (default 12) defines the grid width.
- `rowHeight` (default 60px) + `gap` define pixel density.

---

## 2. Core Layout Algorithm

### Collision Detection

```ts
function collides(a: GridPosition, b: GridPosition): boolean
function getCollisions(item, items, excludeId?): LayoutItem[]
function hasCollision(item, items, excludeId?): boolean
```

Axis-aligned bounding box overlap. Two rects collide if they overlap on both axes.

### Bounds & Snap

```ts
function clampPosition(position, cols, minW?, minH?, maxW?, maxH?): GridPosition
function snapToGrid(position): GridPosition
```

- `clampPosition`: Keeps item within grid bounds and min/max size.
- `snapToGrid`: Rounds x, y, w, h to integers.

### Compaction (Vertical Flow)

```ts
function compact(items, cols, compactType?): LayoutItem[]
```

- Sorts items by row then column.
- Moves each item upward/leftward until it no longer overlaps others.
- Fills gaps; `compactType: 'vertical' | 'horizontal' | null`.

### Placement

```ts
function getNextPosition(items, cols, w, h): GridPosition
function resolveCollisions(item, items, cols): LayoutItem[]
```

- `getNextPosition`: First (x, y) where a w×h block fits.
- `resolveCollisions`: Pushes overlapping items down/right, then compacts.

---

## 3. React Components Structure

```
DashboardGrid          ← Container, calculates pixel positions
├── GridItem (×N)      ← Per layout item
    ├── Drag handle    (top bar, when editing)
    ├── WidgetSlot     → WidgetRenderer → ClockWidget | PlaceholderWidget | ...
    └── Resize handles (8: corners + edges, when editing)
```

### Data Flow

- `useLayoutStore`: items, cols, rowHeight, gap
- `DashboardGrid`: measures container width, computes `colWidth`, `toPixelPosition`
- `GridItem`: receives item + pixel helpers, uses `useGridDrag` and `useGridResize`
- Pixel formula: `left = x * (colWidth + gapX) + gapX`, etc.

### Hooks

- **useGridDrag**: mousedown → document mousemove/mouseup → update position (collision check) → compact on end
- **useGridResize**: mousedown on handle → document mousemove/mouseup → update w/h (collision check) → compact on end

---

## 4. Example Widget Rendering

```tsx
// ClockWidget.tsx
export function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <div className="text-3xl">{now.toLocaleTimeString()}</div>
      <div className="text-sm">{now.toLocaleDateString()}</div>
    </div>
  );
}
```

### Widget Registry

```ts
// widgets/index.tsx
const WIDGET_MAP = { clock: ClockWidget, ... };
function WidgetRenderer({ type, widgetId }) {
  const Component = WIDGET_MAP[type] ?? PlaceholderWidget;
  return <Component type={type} widgetId={widgetId} />;
}
```

`GridItem` → `WidgetSlot` looks up `useWidgetsStore().instances[widgetId]` and passes `type` + `widgetId` to `WidgetRenderer`.
