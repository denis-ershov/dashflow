# Changelog

Все значимые изменения в проекте **DashFlow** будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

---

## [2.0.0-stage4] - 2026-08-27

### Этап 4: Сетка дашборда (ResponsiveGridLayout), навигационный рельс/док, режим правки и навигация с клавиатуры

#### Добавлено / Изменено:
1. **Навигационный каркас `NavRail` (`src/features/navigation/NavRail.tsx`):**
   - Левый вертикальный рельс для десктопа ($\ge 640$ px) и нижняя адаптивная панель для мобильных устройств ($< 640$ px).
   - Интерактивные элементы с зонами нажатия $\ge 44 \times 44$ px и всплывающими подсказками `Tooltip`.
   - Полная замена устаревшего плавающего тулбара `FloatingToolbar` (ADR-013).
2. **Адаптивная сетка `GridEngine` (`src/features/dashboard/components/GridEngine.tsx`):**
   - Интеграция `ResponsiveGridLayout` для 5 брейкпоинтов (`xl`, `lg`, `md`, `sm`, `xs`) с минимальной сеткой в 4 колонки для iPhone SE.
   - Динамический расчет высоты ряда `useGridMetrics` с сохранением квадратных ячеек (72–140 px).
   - Ленивая загрузка компонентов через `LazyWidgetRenderer` и `React.Suspense`.
   - Интеграция `EmptyState` с кнопкой быстрого добавления при пустом дашборде.
3. **Режим редактирования и клавиатурная навигация (`useGridKeyboardNav`):**
   - Блокировка перетаскивания и масштабирования виджетов вне режима правки для защиты от случайных сдвигов.
   - Управление выбранным виджетом с клавиатуры (стрелки для смещения, `Shift + стрелки` для масштабирования, `Escape` для выхода).
   - Оповещение скринридеров через `aria-live`.
4. **Модальные окна и ящики настроек:**
   - Рефакторинг `AddWidgetModal`: динамический каталог всех 12 виджетов с фильтрацией по категориям и поиском.
   - Рефакторинг `WidgetSettingsDrawer`: интеграция декларативной формы `WidgetSettingsForm`.
   - Рефакторинг `CommandPalette`: быстрый вызов команд и виджетов по `Ctrl+K`.
5. **Архитектурная документация и ADR:**
   - Создан `docs/LAYOUT_AND_NAVIGATION_ARCHITECTURE.md`.
   - Создан `docs/adr/ADR-013-responsive-grid-and-nav-rail.md`.

---

## [2.0.0-stage3] - 2026-08-27

### Этап 3: Рефакторинг всех 12 виджетов под новые контракты и дизайн-систему

#### Добавлено / Изменено:
1. **Оболочка `WidgetShell` и изоляция сбоев (`src/core/widget/WidgetShell.tsx`):**
   - Инкапсуляция изолированного `WidgetErrorBoundary` для предотвращения краха дашборда при падении отдельного виджета.
   - Поддержка трех типов поверхностей: `chromeless`, `panel`, `tiles`.
   - Безопасное логирование ошибок без утечки настроек пользователя (ADR-011).
2. **Рефакторинг 12 встроенных виджетов (`src/widgets/built-in/`):**
   - `ClockWidget`: цифровые часы с `Intl.DateTimeFormat`, локализацией и `surface: 'chromeless'`.
   - `SearchWidget`: доступная поисковая строка Spotlight с переключателями поисковиков и `surface: 'chromeless'`.
   - `WeatherWidget`: погода Open-Meteo с кешированием в IndexedDB, обработкой офлайн-режима и `aria-live`.
   - `TodoWidget`: список задач с приоритетами, фильтрами и `STORAGE_KEYS.TODO_ITEMS`.
   - `NotesWidget`: заметки с дебаунсированным автосохранением и счетчиком слов.
   - `QuickLinksWidget`: плиточный вид любимых сайтов с фавиконками и `surface: 'tiles'`.
   - `BookmarksWidget`: закладки Chrome с 2-way sync и Mobile First интерфейсом без HTML-таблиц (Правило 10).
   - `IframeWidget`: безопасное встраивание HTTPS сайтов в песочнице без `allow-same-origin` (ADR-007).
   - `PomodoroWidget`: таймер продуктивности с Web Audio API синтезатором шума фокуса.
   - `QuotesWidget`: коллекция афоризмов с копированием в буфер обмена.
   - `SystemMonitorWidget`: визуальный мониторинг сети и Battery API.
   - `RssWidget`: единый хронологический поток, санитизация ссылок и изображений.
3. **Единый реестр манифестов (`src/widgets/built-in/registry.ts`):**
   - Регистрация метаданных всех 12 виджетов с ленивой загрузкой компонентов `load: () => import(...)` (Code Splitting, ADR-012).
4. **Архитектурная документация и ADR:**
   - Создан `docs/WIDGET_CATALOG_ARCHITECTURE.md`.
   - Созданы `docs/adr/ADR-011-widget-shell-resilience.md` и `docs/adr/ADR-012-widget-code-splitting.md`.

---

## [2.0.0-stage2] - 2026-08-27

### Этап 2: Контракты виджетов, хранилище данных, миграции и i18n-движок

#### Добавлено / Изменено:
1. **Модуль интернационализации (`src/core/i18n/`):**
   - Русские (`ru.ts`) и английские (`en.ts`) словари со 100% паритетом ключей и переводом описания всех 12 виджетов.
   - Рекурсивный вывод типов `TranslationKey` из `typeof ru`.
   - Чистые функции `t()`, `interpolate()`, `getPluralForm()` (на базе `Intl.PluralRules`), `formatDate()` и `formatNumber()`.
   - Защита от показа сырых ключей локализации (Правило 43.12).
   - Zustand-стор `useI18nStore` и реактивный React-хук `useTranslation()`.

2. **Модуль хранилища и адаптеров (`src/core/storage/`):**
   - Строгий реестр `STORAGE_KEYS` (включая ключи резервных копий `DASHBOARD_BACKUP_V1` и `THEME_BACKUP_V1`).
   - Иерархия типизированных ошибок: `StorageError`, `StorageQuotaExceededError`.
   - `StorageAdapter` с автоматическим переключением `chrome.storage.local` $\leftrightarrow$ `localStorage` $\leftrightarrow$ `IndexedDB` (`setLarge`/`getLarge`).
   - Распознавание квот хранилища через `isQuotaError`.

3. **Контракты виджетов без `any` (`src/core/widget/`):**
   - Обобщенный интерфейс манифеста `WidgetDefinition<S>` с поддержкой Code Splitting (`load: () => Promise<{ default: ComponentType<WidgetProps<S>> }>`).
   - Строгие перечисления: `WidgetCategory`, `WidgetPermission` (`storage`, `network`, `bookmarks`, `geolocation`), `WidgetSurfaceType` (`chromeless`, `panel`, `tiles`).
   - Типизированная схема настроек `WidgetSettingFieldSchema<S>[]`.
   - Легковесный чистый валидатор `validateWidgetSettings<S>` с защитой от повреждения данных и fallback на `defaultValue`.
   - Глобальный реестр виджетов `WidgetRegistry` с поддержкой изоляции сбоев (`getOrFallback`).
   - Декларативный генератор форм настроек `WidgetSettingsForm` на базе дизайн-системы.

4. **Адаптивные раскладки и миграция состояния дашборда (`src/stores/useDashboardStore.ts`):**
   - Чистая миграция состояния Dashboard Store v1 $\to$ v2 (`migrateDashboardState`).
   - Автоматический расчет адаптивных сеток `deriveResponsiveLayouts` для 5 брейкпоинтов (`xl`, `lg`, `md`, `sm`, `xs`).
   - Обновление `useDashboardStore` с сохранением обратной совместимости (`widgets`, `columns`, `setColumns`).
   - Автоматическое создание бэкапа `dashflow_backup_v1` перед миграцией (Правило 51).

5. **Архитектурная документация и ADR:**
   - Созданы `docs/WIDGET_CONTRACTS_ARCHITECTURE.md`, `docs/STORAGE_ARCHITECTURE.md`, `docs/I18N_ARCHITECTURE.md`.
   - Созданы `docs/adr/ADR-008-widget-contracts.md`, `docs/adr/ADR-009-storage-strategy.md`, `docs/adr/ADR-010-i18n-strategy.md`.

#### Изменённые / созданные файлы:
- `src/core/i18n/types.ts`
- `src/core/i18n/locales/ru.ts`
- `src/core/i18n/locales/en.ts`
- `src/core/i18n/i18n.ts`
- `src/core/i18n/i18nStore.ts`
- `src/core/i18n/useTranslation.ts`
- `src/core/i18n/index.ts`
- `src/core/storage/keys.ts`
- `src/core/storage/errors.ts`
- `src/core/storage/StorageAdapter.ts`
- `src/core/storage/dashboardMigrations.ts`
- `src/core/storage/index.ts`
- `src/core/widget/types.ts`
- `src/core/widget/validator.ts`
- `src/core/widget/registry.ts`
- `src/core/widget/WidgetSettingsForm.tsx`
- `src/core/widget/index.ts`
- `src/stores/useDashboardStore.ts`
- `src/ui/primitives/Input.tsx`
- `docs/WIDGET_CONTRACTS_ARCHITECTURE.md`
- `docs/STORAGE_ARCHITECTURE.md`
- `docs/I18N_ARCHITECTURE.md`
- `docs/adr/ADR-008-widget-contracts.md`
- `docs/adr/ADR-009-storage-strategy.md`
- `docs/adr/ADR-010-i18n-strategy.md`
- `tests/unit/core/i18n.test.ts`
- `tests/unit/core/storageAdapter.test.ts`
- `tests/unit/core/widgetTypes.test.ts`
- `tests/unit/core/widgetValidator.test.ts`
- `tests/unit/core/widgetRegistry.test.ts`
- `tests/unit/core/dashboardMigrations.test.ts`
- `tests/unit/core/useTranslation.test.ts`
- `tests/unit/stores/dashboardStore.test.ts`
- `tests/component/widget/WidgetSettingsForm.test.tsx`

---

## [2.0.0-stage1] - 2026-08-27

### Этап 1: Дизайн-система и Theme Engine (Глобальный рефакторинг)

#### Добавлено / Изменено:
1. **Тестовая инфраструктура и гейты качества:**
   - Настройка `vitest` + `jsdom` + React Testing Library + `@testing-library/user-event` с изоляцией и автоочисткой DOM (`tests/setup.ts`).
   - Конфигурация ESLint 9 (Flat Config `eslint.config.js`) со строгой типизацией (`no-explicit-any`), проверкой доступности (`jsx-a11y`) и Prettier (`.prettierrc.json`).
   - Автоматический контроль шкалы дизайн-системы (`scale.guard.test.ts`) против использования цветов вне палитры, произвольных z-index и нерегламентированных отступов.

2. **Трёхслойная система токенов и интеграция с Tailwind 4:**
   - `src/styles/tokens.css` и `src/styles/globals.css`:
     - Слой 1: Структурные токены (шкала `z-index` `--z-base`...`--z-toast`, радиусы, тайминги анимаций $\le 250$ ms, тени).
     - Слой 2: 24 семантических токена темы (`--dashflow-*`).
     - Слой 3: Псевдонимы обратной совместимости (`--color-*`, `--glass-*`, `--shadow-*`).
     - Мост в Tailwind 4 (`@theme`, `@theme inline`).
     - Поддержка `prefers-reduced-motion: reduce` для полного отключения анимаций.
     - Удаление внешних Google Fonts из `index.html` (переход на быстрые системные шрифты).

3. **Функциональный модуль цветовой математики (`src/core/theme/color.ts`):**
   - Чистые sRGB вычисления на структуре `Rgba` с нормализованными `[0, 1]` значениями.
   - Парсинг 3/4/6/8-значных HEX, `rgb()`, `rgba()`.
   - Относительная яркость (Relative Luminance) и контраст по формуле WCAG 2.1.
   - Операция сплющивания альфа-канала `flatten(fg, bg)` для достоверного замера контраста на полупрозрачных поверхностях.

4. **Генератор токенов и эталонные пресеты (`src/core/theme/tokens.ts`, `presets.ts`):**
   - Контракт `ThemeTokens` (7 обязательных, 17 автоматически вычисляемых).
   - Чистая функция `resolveTheme` (отказ целиком при некорректных данных с откатом на Neutral Dark).
   - Генератор CSS-переменных `buildThemeCss`.
   - 9 встроенных пресетов (Neutral Dark, Deep Blue, Default Light, Midnight Purple, Ocean Teal, Minimal Monochrome, Aurora Emerald, Glass, High Contrast) с верифицированным контрастом WCAG AA/AAA.

5. **Безопасность пользовательского CSS и обоев (`src/core/theme/cssValidator.ts`, `wallpaper.ts`):**
   - Валидация пользовательского CSS: лимит 50 000 символов, безусловная блокировка `@import`, блокировка небезопасных протоколов в `url()`, тумблер `allowExternalCss` для HTTPS, очистка комментариев.
   - Санитизация обоев: разрешение только `https:`, `data:`, `chrome-extension:`, автоматический расчет затемнения (`scrim` от 0.0 до 0.9).

6. **Монтирование в DOM, версионирование и Zustand Store (`applyTheme.ts`, `migrations.ts`, `themeStore.ts`):**
   - `applyTheme.ts`: единственный модуль прямого управления тегами `<style id="dashflow-theme">` и `<style id="dashflow-custom-css">`, установка `data-theme` и переменных `--app-bg-image` / `--app-scrim`.
   - `migrations.ts`: авто-миграция legacy-состояния v1 $\to$ v2 (переименование `default-dark` в `deep-blue`).
   - `themeStore.ts`: реактивный стор Zustand для управления темой и автоматической синхронизации с DOM.

7. **Библиотека доступных UI компонентов (`src/ui/`):**
   - **Primitives (`src/ui/primitives/`):** `Button`, `Input`, `Switch` (нативный `<button role="switch">`), `Slider`, `Tooltip`, `Badge` с зоной нажатия $\ge 44 \times 44$ px.
   - **Overlays (`src/ui/overlays/`):** `Modal`, `Drawer`, `Dropdown` и хук `useFocusTrap` (удержание фокуса, Escape, возврат фокуса).
   - **Feedback (`src/ui/feedback/`):** `Spinner` (`role="status"`), `Skeleton` (`aria-hidden`), `EmptyState`, `ErrorState` (`role="alert"`).
   - **Appearance Feature (`src/features/appearance/`):** `AppearanceModal`, `PresetGrid`, `WallpaperPicker`, `CustomCssEditor`.

8. **Очистка legacy кода:**
   - Полное удаление устаревших каталогов `src/components/ui/` и `src/features/themes/`.
   - Перевод всех потребителей (виджеты Todo, Pomodoro, Bookmarks, RSS, Toolbar, Modal-окна, App) на новые модули `@/ui/` и `@/core/theme`.
