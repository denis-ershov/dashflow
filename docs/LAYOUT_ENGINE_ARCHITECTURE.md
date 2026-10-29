# Архитектура Сетки, Навигации и Интерфейса (Layout Engine & Navigation Architecture)

## 1. Обзор Layout Engine & Navigation

**Layout Engine** отвечает за адаптивное размещение, перетаскивание (Drag & Drop), изменение размеров (Resize) виджетов и навигацию по дашборду.

```text
┌─────────────────────────────────────────────────────────────┐
│                    DashFlow Root Layout                     │
├─────────────────────────────────────────────────────────────┤
│  FloatingDock (плавающая панель по центру снизу)            │
│  - Зоны нажатия: >= 44x44 px (WCAG 2.1 AAA)                 │
│  - Управление: Режим, Виджеты, Поиск, Темы, Звуки, Правка   │
├─────────────────────────────────────────────────────────────┤
│  ResponsiveGridLayout (5 Брейкпоинтов, Динамическая высота) │
│  - xl: 12 колонок (>= 1280px)                               │
│  - lg: 8 колонок  (>= 1024px)                               │
│  - md: 6 колонок  (>= 768px)                                │
│  - sm: 4 колонки  (>= 640px)                                │
│  - xs: 2 колонки  (< 640px / Mobile First 360-375px)        │
│                                                             │
│  useGridMetrics: высота ряда 72-140 px по высоте экрана     │
│  useGridKeyboardNav: стрелки / Shift+стрелки в режиме правки│
├─────────────────────────────────────────────────────────────┤
│  Модальные окна и оверлеи (Appearance, Marketplace, etc.)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Принципы построения Сетки (Grid Mechanics)

1. **5 Адаптивных брейкпоинтов:**
   - Автоматическая адаптация сетки от мобильных экранов iPhone SE (360 px) до 4K мониторов (3840 px) без горизонтального скролла (Правила 8–11).
2. **Динамический расчет высоты ряда (`useGridMetrics.ts`):**
   - Расчет формулы: `clamp(72, floor((window.innerHeight - padding) / 8), 140)`.
   - На экранах с любой плотностью пикселей дашборд сохраняет идеальные пропорции.
3. **Клавиатурная доступность (`useGridKeyboardNav.ts`, подключён в `GridEngine`):**
   - Работает только в режиме редактирования (`isEditMode`) и только когда не открыты модалка или панель настроек виджета — иначе `Escape` и стрелки принадлежат оверлею.
   - Виджеты в режиме правки получают `tabIndex=0`; выбранным считается виджет, на котором (или внутри которого) стоит фокус.
   - `ArrowKeys` — перемещение на 1 ячейку, `Shift + ArrowKeys` — изменение размера, `Escape` — выход из режима правки.
   - Стрелки, нажатые в `input`/`textarea`/`select`/`contenteditable` внутри виджета, игнорируются сеткой.
   - Границы считает чистая функция `applyKeyboardDelta`: виджет не выходит за края сетки и не становится меньше `size.minW/minH` из манифеста. Изменение применяется к текущему брейкпоинту через `updateLayout(breakpoint, items)` — так же, как drag мышью.
   - Объявление действий для Screen Reader через `aria-live="polite"`.

---

## 3. UI Component System (`src/ui/`)

- **`src/ui/primitives/`:** `Button`, `Input`, `Switch`, `Slider`, `Tooltip`, `Badge`.
- **`src/ui/overlays/`:** `Modal`, `Drawer`, `Dropdown` (пока не используется, см. `docs/AUDIT_2026-10-29.md`), `useFocusTrap` (фокус-ловушки, возврат фокуса, `Escape`).
- **`src/ui/feedback/`:** `Spinner`, `Skeleton`, `EmptyState`, `ErrorState`, `RootErrorBoundary`.

---

## 4. Дополнительная документация

- Подробное описание: [LAYOUT_AND_NAVIGATION_ARCHITECTURE.md](file:///e:/DEV/Project/dashflow/docs/LAYOUT_AND_NAVIGATION_ARCHITECTURE.md)
- Решение: [ADR-013](file:///e:/DEV/Project/dashflow/docs/adr/ADR-013-responsive-grid-and-nav-rail.md).
