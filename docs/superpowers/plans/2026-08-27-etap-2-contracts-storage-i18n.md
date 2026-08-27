# План реализации: Этап 2 — Контракты виджетов, типизированные настройки, хранилище данных, миграции и i18n-движок

> **Для агента:** ОБЯЗАТЕЛЬНЫЙ НАВЫК: Используй `superpowers:executing-plans` для пошаговой реализации этого плана.

**Цель:** Построить надёжный фундамент данных DashFlow: строгие типизированные контракты виджетов без `any` с ленивой загрузкой компонентов, декларативную схему настроек с валидатором, типизированный реестр хранилища с безопасной миграцией состояния v1 $\to$ v2 и резервной копией, а также независимый i18n-движок с интерполяцией, плюрализацией и форматированием дат/чисел через `Intl`.

**Архитектура:** 
- Чистые функции ядра в `src/core/i18n/`, `src/core/storage/`, `src/core/widget/`.
- Отсутствие `any` в контрактах: дженерики `WidgetDefinition<S>`, строгие типы permissions, поверхностей и настроек.
- Версионированное хранилище с чистой функцией миграции `migrateDashboardState(rawState)` и автоматическим бэкапом `dashflow_backup_v1`.
- Автоматический генератор форм настроек `WidgetSettingsForm` на базе схемы и компонентов дизайн-системы `@/ui/primitives`.

**Стек технологий:** TypeScript 5.7+ (strict), Zustand 4.5+ (`persist` с `version` и `migrate`), `Intl.PluralRules`, `Intl.DateTimeFormat`, `Intl.NumberFormat`, React 18.3+, Vitest 2.1+, React Testing Library, ESLint 9.

---

## Перечень задач

### Задача 1: Движок i18n и типы ключей (`src/core/i18n/`)
**Файлы:**
- Создать: `src/core/i18n/types.ts`
- Создать: `src/core/i18n/locales/ru.ts`
- Создать: `src/core/i18n/locales/en.ts`
- Создать: `src/core/i18n/i18n.ts`
- Создать: `src/core/i18n/index.ts`
- Тест: `tests/unit/core/i18n.test.ts`

**Шаги:**
1. Написать тесты `tests/unit/core/i18n.test.ts` (проверка `t(key)`, интерполяции `{{param}}`, плюрализации для `ru` и `en`, fallback на дефолтный язык при отсутствии ключа, форматирование дат и чисел, тест равенства ключей `ru` и `en`).
2. Создать словарь `ru.ts` со всеми переводами приложения (общие, виджеты, настройки, темы, ошибки, доступность).
3. Создать словарь `en.ts` с полным соответствием структуры ключей `ru.ts`.
4. Реализовать `src/core/i18n/i18n.ts` с рекурсивным выводом `TranslationKey`, функциями `t(key, params, lang)`, `formatDate(date, options, lang)`, `formatNumber(num, options, lang)`.
5. Прогнать тесты: `npx vitest run tests/unit/core/i18n.test.ts`.
6. Закоммитить: `git commit -m 'feat(i18n): ядро мультиязычности с интерполяцией, плюрализацией и типизацией'`.

---

### Задача 2: Типизированный реестр ключей хранилища и ошибки квот (`src/core/storage/`)
**Файлы:**
- Создать: `src/core/storage/keys.ts`
- Создать: `src/core/storage/errors.ts`
- Создать: `src/core/storage/StorageAdapter.ts`
- Создать: `src/core/storage/index.ts`
- Тест: `tests/unit/core/storageAdapter.test.ts`

**Шаги:**
1. Написать тесты `tests/unit/core/storageAdapter.test.ts` (чтение, запись, обработка переполнения квоты, fallback на localStorage, IndexedDB для `setLarge`).
2. Реализовать `src/core/storage/keys.ts` с перечислением всех ключей (`STORAGE_KEYS`).
3. Реализовать типизированные ошибки `StorageQuotaError`, `StorageSerializationError` в `errors.ts`.
4. Реализовать `StorageAdapter.ts` с гарантированной обработкой ошибок и типизированными методами `get`, `set`, `remove`, `getLarge`, `setLarge`.
5. Прогнать тесты: `npx vitest run tests/unit/core/storageAdapter.test.ts`.
6. Закоммитить: `git commit -m 'feat(storage): типизированный реестр ключей хранилища и StorageAdapter'`.

---

### Задача 3: Контракты виджетов и типизация (`src/core/widget/types.ts`)
**Файлы:**
- Создать: `src/core/widget/types.ts`
- Создать: `src/core/widget/index.ts`
- Тест: `tests/unit/core/widgetTypes.test.ts`

**Шаги:**
1. Написать тест `tests/unit/core/widgetTypes.test.ts` на корректность статической типизации манифестов и схем.
2. Определить в `types.ts`:
   - `WidgetPermission = 'storage' | 'network' | 'bookmarks' | 'geolocation'`
   - `WidgetSurfaceType = 'chromeless' | 'panel' | 'tiles'`
   - `WidgetCategory = 'productivity' | 'utilities' | 'media' | 'system'`
   - `WidgetSize = { minW: number; minH: number; defaultW: number; defaultH: number; maxW?: number; maxH?: number }`
   - `WidgetSettingFieldSchema<T>` (типы `text`, `number`, `boolean`, `select`, `slider`, `color`, `multiselect`)
   - `WidgetSettingsSchema<S>`
   - `WidgetDefinition<S>` с `load: () => Promise<{ default: React.ComponentType<WidgetProps<S>> }>`
3. Прогнать тесты и проверить tsc: `npx vitest run tests/unit/core/widgetTypes.test.ts; npx tsc --noEmit`.
4. Закоммитить: `git commit -m 'feat(widget): строгие типизированные контракты виджетов без any'`.

---

### Задача 4: Валидатор настроек виджетов по схеме (`src/core/widget/validator.ts`)
**Файлы:**
- Создать: `src/core/widget/validator.ts`
- Тест: `tests/unit/core/widgetValidator.test.ts`

**Шаги:**
1. Написать тесты `tests/unit/core/widgetValidator.test.ts` (проверка типов, диапазонов `min/max`, вариантов `select`, списков `multiselect`, автоподстановка `defaultValue` при некорректных данных).
2. Реализовать функцию `validateWidgetSettings<S>(settings: unknown, schema: WidgetSettingsSchema<S>): S`.
3. Убедиться, что недоверенные входные данные (из хранилища или импорта) безопасно приводятся к валидному объекту настроек без исключений.
4. Прогнать тесты: `npx vitest run tests/unit/core/widgetValidator.test.ts`.
5. Закоммитить: `git commit -m 'feat(widget): валидатор настроек по схеме с безопасным fallback'`.

---

### Задача 5: Ленивый реестр виджетов (`src/core/widget/registry.ts`)
**Файлы:**
- Создать: `src/core/widget/registry.ts`
- Тест: `tests/unit/core/widgetRegistry.test.ts`

**Шаги:**
1. Написать тесты `tests/unit/core/widgetRegistry.test.ts` (регистрация, получение по ID, список категорий, фильтрация, обработка неизвестного `widgetId`).
2. Реализовать `WidgetRegistry` класс с методами `register`, `get`, `getAll`, `getByCategory`, `isRegistered`.
3. Реализовать обработку `getOrFallback(id)` возвращающую заглушку недоступного виджета.
4. Прогнать тесты: `npx vitest run tests/unit/core/widgetRegistry.test.ts`.
5. Закоммитить: `git commit -m 'feat(widget): ленивый реестр виджетов WidgetRegistry'`.

---

### Задача 6: Генератор форм настроек (`src/core/widget/WidgetSettingsForm.tsx`)
**Файлы:**
- Создать: `src/core/widget/WidgetSettingsForm.tsx`
- Тест: `tests/component/widget/WidgetSettingsForm.test.tsx`

**Шаги:**
1. Написать компонентные тесты `WidgetSettingsForm.test.tsx` (рендер всех типов полей: text, number, switch, slider, select, multiselect; отправка изменений `onChange`).
2. Реализовать `WidgetSettingsForm` с использованием доступных компонентов `@/ui/primitives` (`Input`, `Switch`, `Slider`, `Dropdown`).
3. Прогнать тесты: `npx vitest run tests/component/widget/WidgetSettingsForm.test.tsx`.
4. Закоммитить: `git commit -m 'feat(widget): декларативный генератор форм настроек на базе UI primitives'`.

---

### Задача 7: Миграция состояния Dashboard Store v1 $\to$ v2 (`src/core/storage/migrations.ts`)
**Файлы:**
- Создать: `src/core/storage/migrations.ts`
- Тест: `tests/unit/core/dashboardMigrations.test.ts`

**Шаги:**
1. Написать тесты `tests/unit/core/dashboardMigrations.test.ts` (миграция плоского массива `Layout[]` в многоколоночные `layouts: { xl, lg, md, sm, xs }`, сохранение бэкапа в `dashflow_backup_v1`, валидация настроек каждого инстанса виджета, откат при сбое).
2. Реализовать чистую функцию `migrateDashboardState(rawState: unknown): MigratedDashboardState`.
3. Реализовать сохранение снапшота в `dashflow_backup_v1`.
4. Прогнать тесты: `npx vitest run tests/unit/core/dashboardMigrations.test.ts`.
5. Закоммитить: `git commit -m 'feat(storage): чистая миграция состояния дашборда v1 в v2 с автобэкапом'`.

---

### Задача 8: Рефакторинг и типизация `useDashboardStore` (`src/features/dashboard/dashboardStore.ts`)
**Файлы:**
- Создать: `src/features/dashboard/dashboardStore.ts`
- Тест: `tests/unit/features/dashboardStore.test.ts`

**Шаги:**
1. Написать тесты `tests/unit/features/dashboardStore.test.ts` (добавление/удаление виджетов, обновление настроек с валидацией, переключение режимов `isLocked`, `isEditMode`, переключение брейкпоинтов, персистентность с `version: 2`).
2. Реализовать `useDashboardStore` с типизацией:
   - `instances: WidgetInstance[]`
   - `layouts: ResponsiveLayouts`
   - `activeBreakpoint: Breakpoint`
   - `isEditMode: boolean`
   - `isLocked: boolean`
   - `activeModal: ModalType | null`
   - `version: 2` и вызов `migrateDashboardState` в опции `migrate` zustand persist.
3. Прогнать тесты: `npx vitest run tests/unit/features/dashboardStore.test.ts`.
4. Закоммитить: `git commit -m 'feat(dashboard): типизированный Zustand-стор useDashboardStore с версией 2'`.

---

### Задача 9: Миграция манифестов встроенных виджетов на новые контракты
**Файлы:**
- Создать: манифесты в `src/widgets/manifests/` (или по папкам виджетов `src/widgets/built-in/*/manifest.ts`)
- Зарегистрировать все 12 виджетов через манифесты в реестре.
- Тест: `tests/unit/core/builtInManifests.test.ts`

**Шаги:**
1. Создать манифесты для 12 виджетов с типизированными схемами настроек, ключами локализации и `load: () => import(...)`.
2. Написать тест `tests/unit/core/builtInManifests.test.ts` проверяющий корректность регистрации и валидности схем всех 12 виджетов.
3. Прогнать тесты: `npx vitest run tests/unit/core/builtInManifests.test.ts`.
4. Закоммитить: `git commit -m 'feat(widgets): манифесты 12 виджетов на новом типизированном контракте'`.

---

### Задача 10: Интеграция i18n в UI и обновление хуков
**Файлы:**
- Создать: `src/core/i18n/useTranslation.ts`
- Обновить использование локализации в `App.tsx`, `AppearanceModal.tsx`, `FloatingToolbar.tsx`, `SettingsModal.tsx`.
- Тест: `tests/unit/core/useTranslation.test.ts`

**Шаги:**
1. Реализовать React-хук `useTranslation()` с реактивной сменой языка из `useAppStore`.
2. Перевести все текстовые строки затронутых компонентов на вызовы `t('key')`.
3. Запустить тесты: `npm test`.
4. Закоммитить: `git commit -m 'refactor(i18n): перевод UI компонентов на хук useTranslation'`.

---

### Задача 11: Создание ADRs и обновление архитектурной документации
**Файлы:**
- Создать: `docs/adr/ADR-001-declarative-plugins.md`
- Создать: `docs/adr/ADR-002-responsive-grid-layout.md`
- Создать: `docs/adr/ADR-003-custom-i18n.md`
- Создать: `docs/adr/ADR-006-storage-sync-scope.md`
- Обновить: `docs/CORE_ARCHITECTURE.md`
- Обновить: `docs/WIDGET_ENGINE_ARCHITECTURE.md`
- Обновить: `docs/CHANGELOG.md`

**Шаги:**
1. Заполнить ADR-001 (декларативные плагины в MV3), ADR-002 (ResponsiveGridLayout), ADR-003 (собственный легковесный i18n движок), ADR-006 (ограничение sync storage).
2. Обновить архитектурные документы `CORE_ARCHITECTURE.md` и `WIDGET_ENGINE_ARCHITECTURE.md`.
3. Добавить запись о релизе `2.0.0-stage2` в `docs/CHANGELOG.md`.
4. Закоммитить: `git commit -m 'docs(core): ADR-001, ADR-002, ADR-003, ADR-006 и обновление архитектурной документации'`.

---

### Задача 12: Финальный аудит Этапа 2
**Шаги:**
1. Запустить полный цикл проверок: `npm test; npx tsc --noEmit; npm run lint; npm run build`.
2. Проверить все критерии Definition of Done Этапа 2.
3. Зафиксировать финальный коммит / тег этапа.
