# План реализации: Этап 4. Сетка дашборда (ResponsiveGridLayout), навигационный рельс/док, режим правки и навигация с клавиатуры

> **Цель этапа:** Реализовать современный каркас приложения с левым навигационным рельсом (NavRail), адаптирующимся в нижнюю панель на мобильных устройствах, внедрить отзывчивую сетку `ResponsiveGridLayout` для 5 брейкпоинтов с квадратными ячейками (72–140 px), изолированный режим правки и управление с клавиатуры.

---

## 1. Задачи этапа

### Задача 1: Навигационный рельс (`NavRail`) и мобильная нижняя панель
- Создать компонент `src/features/navigation/NavRail.tsx`.
- Поддержка двух режимов отображения:
  - Десктоп / планшет ($\ge 640$ px): левый вертикальный рельс, прижатый к левому краю экрана.
  - Мобильные устройства ($< 640$ px): нижняя фиксированная панель (`bottom-0 left-0 right-0`).
- Кнопки навигации с доступными подсказками (`Tooltip`) и зонами касания $\ge 44 \times 44$ px:
  - Добавить виджет (`+`)
  - Поиск / Command Palette (`Search`, `Ctrl+K`)
  - Темы оформления (`Palette`)
  - Каталог / Marketplace (`ShoppingBag`)
  - Режим правки (`Edit3` / `Check`)
  - Настройки (`Settings`)
- Тесты: `tests/component/navigation/NavRail.test.tsx`.

### Задача 2: Движок динамической высоты ряда ячейки сетки (`useGridMetrics`)
- Создать хук `src/features/dashboard/hooks/useGridMetrics.ts`.
- Расчет ширины ячейки на основе ширины контейнера и количества колонок для текущего брейкпоинта.
- Ограничение `rowHeight`: от 72 px до 140 px для предотвращения гигантских баннеров на 2K/4K мониторах.
- Тесты: `tests/unit/dashboard/useGridMetrics.test.ts`.

### Задача 3: Рефакторинг `GridEngine` под `ResponsiveGridLayout` и ленивую загрузку
- Обновить `src/features/dashboard/components/GridEngine.tsx`.
- Использование `ResponsiveGridLayout` с брейкпоинтами `xl (1200)`, `lg (900)`, `md (640)`, `sm (360)`, `xs (0)`.
- Интеграция `WidgetRegistry` и ленивая загрузка компонентов через `manifest.load()` с `React.Suspense` и `Skeleton`.
- Интеграция `WidgetShell` для каждого виджета с передачей флагов `surface`, `isEditMode`, `onOpenSettings`, `onRemove`.
- Блокировка перетаскивания и изменения размера вне режима правки (`isDraggable={isEditMode}`, `isResizable={isEditMode}`).
- Тесты: `tests/component/dashboard/GridEngine.test.tsx`.

### Задача 4: Клавиатурная навигация и управление сеткой в режиме правки (`useGridKeyboardNav`)
- Создать хук `src/features/dashboard/hooks/useGridKeyboardNav.ts`.
- В режиме правки:
  - Выбор активного виджета фокусом (`Tab` / клик).
  - Перемещение виджета клавишами стрелок (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`).
  - Изменение размера с `Shift + ArrowKeys`.
  - Выход из режима по `Escape`.
  - Объявление изменений для скринридеров через `aria-live`.
- Тесты: `tests/unit/dashboard/useGridKeyboardNav.test.ts`.

### Задача 5: Обновление `WidgetSettingsDrawer` на базе `WidgetSettingsForm`
- Рефакторинг `src/features/dashboard/components/WidgetSettingsDrawer.tsx`.
- Использование `WidgetSettingsForm` с автоматической валидацией через `validateWidgetSettings`.
- Локализация и дизайн-токены.
- Тесты: `tests/component/dashboard/WidgetSettingsDrawer.test.tsx`.

### Задача 6: Обновление модального окна добавления виджетов (`AddWidgetModal`)
- Рефакторинг `src/features/dashboard/components/AddWidgetModal.tsx`.
- Карточки виджетов из `WidgetRegistry.getAll()` с фильтрацией по категориям и поиском.
- Предпросмотр размера и типа поверхности.
- Кнопка добавления в один клик с вычислением свободной позиции на сетке.
- Тесты: `tests/component/dashboard/AddWidgetModal.test.tsx`.

### Задача 7: Обновление главного каркаса приложения (`entrypoints/newtab/App.tsx`)
- Интеграция `NavRail`, удаление устаревшего `FloatingToolbar` и старой шапки.
- Размещение основного контента с динамическими полями без жесткого `max-w-7xl`.
- Горячие клавиши (`Ctrl+K` / `Cmd+K` для палитры команд, `e` для режима правки).
- Тесты: `tests/component/App.test.tsx`.

### Задача 8: Документация, ADR и CHANGELOG
- Создать `docs/LAYOUT_AND_NAVIGATION_ARCHITECTURE.md`.
- Создать `docs/adr/ADR-013-responsive-grid-and-nav-rail.md`.
- Добавить секцию `[2.0.0-stage4]` в `docs/CHANGELOG.md`.

### Задача 9: Комплексная проверка, аудит качества и сборка
- Полный прогон `npm test` (все сьюты).
- `npx tsc --noEmit`.
- `npm run lint`.
- `npm run build`.

---

## 2. Критерии приемки (DoD)
- Навигационный рельс адаптируется между левым краем ($\ge 640$ px) и нижним баром ($< 640$ px).
- Сетка адаптируется под 5 брейкпоинтов без горизонтального скролла от 360 px до 4K.
- Перемещение и ресайз виджетов возможны только в режиме правки.
- Доступность с клавиатуры: стрелки для позиционирования, `Shift + стрелки` для ресайза, `Escape` для выхода.
- Все тесты, typecheck, lint и build проходят без ошибок.
