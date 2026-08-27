# Архитектура ядра системы (Core Architecture)

## 1. Общий обзор архитектуры

**DashFlow 2.0** построен по принципу **Core-First Architecture**. Ядро приложения полностью изолировано от предметной логики конкретных виджетов, что превращает расширение в полноценную платформу новой вкладки Chrome.

```text
┌─────────────────────────────────────────────────────────┐
│                 Chrome Manifest V3                      │
├─────────────────────────────────────────────────────────┤
│                      WXT Core                           │
│  ┌───────────────────────┐   ┌───────────────────────┐  │
│  │ Background Service    │   │ NewTab Entrypoint     │  │
│  │ Worker                │   │ (src/entrypoints/     │  │
│  │ (background.ts)       │   │  newtab/index.html)   │  │
│  └───────────┬───────────┘   └───────────┬───────────┘  │
└──────────────┼───────────────────────────┼──────────────┘
               │                           │
               ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                      CORE LAYER                         │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ StorageAdapter│ │ Localization  │ │ Theme Engine  │  │
│  │ (keys/migrate)│ │ (i18n ru/en)  │ │ (3-layer/sRGB)│  │
│  └───────────────┘ └───────────────┘ └───────────────┘  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ WidgetRegistry│ │ Plugins &     │ │ Permissions   │  │
│  │ (lazy loading)│ │ SandboxBridge │ │ Consent Flow  │  │
│  └───────────────┘ └───────────────┘ └───────────────┘  │
└─────────────────────────────┬───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                 UI & FEATURES LAYER                     │
│  ┌───────────────────┐        ┌──────────────────────┐  │
│  │ NavRail & Grid    │        │ 12 Built-in Widgets  │  │
│  │ (5 Breakpoints)   │        │ & Declarative Plugins│  │
│  └───────────────────┘        └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Зоны ответственности модулей Ядра (`src/core/`)

### 2.1. Хранилище (`src/core/storage/`)
- `StorageAdapter`: единый фасад к `chrome.storage.local` с fallback на `localStorage` в dev-среде.
- Реестр строгих ключей `STORAGE_KEYS` (без magic strings).
- Движок миграций `runDashboardMigrations` и версионирование схемы (`version: 2`).

### 2.2. Локализация (`src/core/i18n/`)
- Поддержка русского (`ru`) и английского (`en`) языков.
- `useTranslation()` хук с типизированными ключами и параметрической интерполяцией.
- Интеграция с локалями расширения `_locales/`.

### 2.3. Движок Темы (`src/core/theme/`)
- Трёхслойная система токенов: базовые структурные токены, семантические токены темы, CSS variables.
- Чистая функциональная математика цвета в sRGB (`color.ts`), расчет относительной яркости и контраста по WCAG 2.1.
- 9 эталонных пресетов (`presets.ts`).
- Валидация кастомного CSS (`cssValidator.ts`) и санитизация обоев (`wallpaper.ts`).

### 2.4. Реестр виджетов (`src/core/widget/`)
- `WidgetRegistry`: единый реестр 12 встроенных виджетов и пользовательских плагинов.
- Ленивая загрузка (`load: () => import(...)`) для обеспечения Code Splitting и мгновенного открытия новой вкладки.

### 2.5. Плагины и Песочница (`src/core/plugins/`)
- Декларативные манифесты плагинов (`rss`, `embed`, `links`, `api`) без удаленного JS.
- Безопасный RPC-мост `SandboxBridge` для изолированного фрейма `iframe` (`sandbox="allow-scripts"` без `allow-same-origin`).

### 2.6. Менеджер Разрешений (`src/core/permissions/`)
- `PermissionManager`: управление выданными согласиями (`storage`, `network`, `bookmarks`, `geolocation`).
- Интеграция с `PermissionConsentModal`.

---

## 3. Архитектурные Решения (ADR Index)

- [ADR-004: Pure Color Math](file:///e:/DEV/Project/dashflow/docs/adr/ADR-004-pure-color-math.md)
- [ADR-005: Three-Layer Token Architecture](file:///e:/DEV/Project/dashflow/docs/adr/ADR-005-three-layer-tokens.md)
- [ADR-007: Custom CSS & Wallpaper Security](file:///e:/DEV/Project/dashflow/docs/adr/ADR-007-custom-css-security.md)
- [ADR-008: Widget Contracts & Settings Schemas](file:///e:/DEV/Project/dashflow/docs/adr/ADR-008-widget-contracts.md)
- [ADR-009: Storage Strategy & Migrations](file:///e:/DEV/Project/dashflow/docs/adr/ADR-009-storage-strategy.md)
- [ADR-010: Type-Safe i18n Strategy](file:///e:/DEV/Project/dashflow/docs/adr/ADR-010-i18n-strategy.md)
- [ADR-011: Widget Shell Resilience & Error Boundaries](file:///e:/DEV/Project/dashflow/docs/adr/ADR-011-widget-shell-resilience.md)
- [ADR-012: Widget Code Splitting & Dynamic Imports](file:///e:/DEV/Project/dashflow/docs/adr/ADR-012-widget-code-splitting.md)
- [ADR-013: Responsive Grid Layout & NavRail](file:///e:/DEV/Project/dashflow/docs/adr/ADR-013-responsive-grid-and-nav-rail.md)
- [ADR-014: Declarative Plugins & Sandbox Bridge](file:///e:/DEV/Project/dashflow/docs/adr/ADR-014-declarative-plugins-and-sandbox-bridge.md)
- [ADR-015: Permissions Consent Flow](file:///e:/DEV/Project/dashflow/docs/adr/ADR-015-permissions-consent-flow.md)
