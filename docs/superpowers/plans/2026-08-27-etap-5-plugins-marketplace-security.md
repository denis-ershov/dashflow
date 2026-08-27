# План реализации: Этап 5. Декларативная система плагинов, Marketplace, Permissions Flow и безопасность песочницы

> **Цель этапа:** Реализовать декларативную систему плагинов на базе валидируемых JSON-манифестов (соответствие Manifest V3 без remote code), безопасный изолированный RPC-мост песочницы с проверкой `event.source`, диалог согласия на права доступа (Permissions Consent Flow), единый каталог Marketplace на базе `WidgetRegistry` и CSP.

---

## 1. Задачи этапа

### Задача 1: Типы и валидатор декларативных плагинов (`src/core/plugins/`)
- Создать `src/core/plugins/types.ts`:
  - `DeclarativePluginType`: `'rss' | 'embed' | 'links' | 'api'`.
  - `DeclarativePluginManifest`: `id`, `name`, `version`, `author`, `type`, `description`, `permissions`, `icon`, `size`, `config` (типизированный для каждого типа плагина).
- Создать `src/core/plugins/validator.ts`:
  - `validatePluginManifest(json: unknown): { valid: boolean; manifest?: DeclarativePluginManifest; errors?: string[] }`.
  - Проверка безопасных протоколов (`https:`), допустимых размеров, отсутствия исполняемого кода.
- Тесты: `tests/unit/plugins/pluginValidator.test.ts`.

### Задача 2: Реестр и стор пользовательских плагинов (`src/core/plugins/pluginStore.ts`)
- Создать Zustand-стор `usePluginStore` с персистентностью в `STORAGE_KEYS.CUSTOM_PLUGINS`.
- Действия: `installPlugin(manifest)`, `uninstallPlugin(pluginId)`, `getPlugin(pluginId)`.
- Автоматическая регистрация плагинов в `WidgetRegistry` как динамических манифестов.
- Тесты: `tests/unit/plugins/pluginStore.test.ts`.

### Задача 3: Модуль управления разрешениями (`src/core/permissions/`)
- Создать `src/core/permissions/types.ts` и `permissionManager.ts`:
  - Ключи: `STORAGE_KEYS.PERMISSION_GRANTS`.
  - Методы: `hasPermission(widgetId, perm)`, `grantPermissions(widgetId, perms)`, `revokePermissions(widgetId)`, `getAllGrants()`.
- Создать компонент согласия `src/features/permissions/PermissionConsentModal.tsx`.
- Тесты: `tests/unit/permissions/permissionManager.test.ts` и `tests/component/permissions/PermissionConsentModal.test.tsx`.

### Задача 4: Безопасный Sandbox Bridge (`src/core/plugins/SandboxBridge.ts` и `PluginHost.tsx`)
- Создать безопасный диспетчер RPC-сообщений:
  - Фильтрация по окну: `event.source === iframe.contentWindow`.
  - Проверка прав перед операциями `STORAGE_GET`/`STORAGE_SET` (`plugin_${pluginId}_${key}`).
  - Отсутствие `allow-same-origin` в `sandbox="allow-scripts"`.
- Тесты: `tests/unit/plugins/sandboxBridge.test.ts` и `tests/component/plugins/PluginHost.test.tsx`.

### Задача 5: Рефакторинг MarketplaceModal на базе единого реестра и импорта JSON
- Обновить `src/features/marketplace/components/MarketplaceModal.tsx`.
- Источник данных: `WidgetRegistry.getAll()` + кастомные плагины из `usePluginStore`.
- Фильтры по категориям, типам (встроенные / пользовательские / SDK), поиск по названию/описанию.
- Вкладка импорта / добавления пользовательского JSON-плагина с валидацией.
- Интеграция `PermissionConsentModal` при установке виджетов/плагинов с чувствительными разрешениями.
- Тесты: `tests/component/marketplace/MarketplaceModal.test.tsx`.

### Задача 6: Конфигурация Manifest V3 и Content Security Policy (`wxt.config.ts`)
- Сужение `host_permissions` до конкретных доменов (`api.open-meteo.com`, `images.unsplash.com`).
- Настройка явного `content_security_policy` для `extension_pages` и `sandbox`.
- Настройка `default_locale: 'ru'`.
- Тесты: `tests/unit/core/wxtConfig.test.ts`.

### Задача 7: Архитектурная документация, ADR и CHANGELOG
- Создать `docs/PLUGINS_AND_SECURITY_ARCHITECTURE.md`.
- Создать `docs/adr/ADR-014-declarative-plugins-and-sandbox-bridge.md`.
- Создать `docs/adr/ADR-015-permissions-consent-flow.md`.
- Добавить секцию `[2.0.0-stage5]` в `docs/CHANGELOG.md`.

### Задача 8: Комплексная проверка, аудит качества и сборка
- Полный прогон `npm test` (все сьюты).
- `npx tsc --noEmit`.
- `npm run lint`.
- `npm run build`.

---

## 2. Критерии приемки (DoD)
- Все плагины работают исключительно через валидируемый JSON без внешнего JS-кода (MV3 compliant).
- Sandbox Bridge изолирует сообщения по `event.source` и защищает хранилище префиксом плагина.
- Permissions Flow запрашивает согласие пользователя перед предоставлением доступа к `network` и `bookmarks`.
- Marketplace синхронизирован с `WidgetRegistry` и поддерживает импорт пользовательских плагинов.
- CSP строго настроен.
- Все тесты, typecheck, lint и build проходят без ошибок.
