# Архитектура Безопасности (Security Architecture)

## 1. Общие Принципы Безопасности (Security by Design)

Проект **DashFlow** спроектирован по стандарту **Security by Design** в строгом соответствии с требованиями Google Chrome Extension Manifest V3 (ADR-001, ADR-007, ADR-014, ADR-015, Правило 32).

```text
┌─────────────────────────────────────────────────────────────┐
│                    Chrome MV3 Security                      │
├─────────────────────────────────────────────────────────────┤
│  Content Security Policy (CSP)                              │
│  - extension_pages: script-src 'self'; object-src 'self';   │
│    frame-src https:;                                        │
│  - sandbox: sandbox allow-scripts; script-src 'self';       │
│    object-src 'none'                                        │
├─────────────────────────────────────────────────────────────┤
│  Host Permissions & Data Minimization                       │
│  - Сужение host_permissions до конкретных доменов           │
│    (api.open-meteo.com, images.unsplash.com)                │
│  - Запрет wildcard ('<all_urls>')                           │
├─────────────────────────────────────────────────────────────┤
│  Permissions Consent Flow (ADR-015)                         │
│  - Диалог согласия перед установкой чувствительных плагинов │
│  - Изоляция ключей хранилища dashflow_plugin_${id}_${key}   │
│  - Проверка event.source === iframe.contentWindow (RPC)     │
├─────────────────────────────────────────────────────────────┤
│  Санитизация Custom CSS & Wallpaper                         │
│  - Запрет @import, behavior, -moz-binding                   │
│  - Запрет javascript: и небезопасных URL схем               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Изоляция Песочницы Iframe (ADR-014)

1. **Запрет `allow-same-origin`:** Iframe виджетов использует `sandbox="allow-scripts"` без `allow-same-origin`. Благодаря этому origin фрейма равен `'null'`, исключая доступ к DOM или Cookies родительской страницы.
2. **RPC по ссылке на Window:** Мост `SandboxBridge.ts` валидирует отправителя по `event.source === iframe.contentWindow`, предотвращая подделку сообщений другими фреймами.
3. **Изоляция хранилища:** Каждый плагин имеет доступ только к ключам своего пространства имен.

---

## 3. Модель Разрешений (ADR-015)

- Чувствительные разрешения (`network`, `bookmarks`, `geolocation`) запрашиваются через `PermissionConsentModal` перед активацией.
- Отзыв разрешений доступен в любое время без потери основных данных приложения.

---

## 4. Защита от Утечек и XSS

1. **Санитаризация Пользовательского CSS (`cssValidator.ts`):** Блокировка `@import`, внешних шрифтов без разрешения и устаревших XSS-векторов.
2. **Санитаризация Обоев (`wallpaper.ts`):** Валидация протоколов `https:`, `chrome-extension:`, `data:` и экранирование кавычек.
3. **Безопасные ссылки в RSS и Iframe:** Проверка схемы `isSecureUrl()` (только `https:`).
4. **Конфиденциальность в логах:** В логах `RootErrorBoundary` и `WidgetShell` не выводятся пользовательские настройки и токены.

---

## 5. Дополнительная документация

- Подробности: [PLUGINS_AND_SECURITY_ARCHITECTURE.md](file:///e:/DEV/Project/dashflow/docs/PLUGINS_AND_SECURITY_ARCHITECTURE.md)
- Решения: [ADR-007](file:///e:/DEV/Project/dashflow/docs/adr/ADR-007-custom-css-security.md), [ADR-014](file:///e:/DEV/Project/dashflow/docs/adr/ADR-014-declarative-plugins-and-sandbox-bridge.md), [ADR-015](file:///e:/DEV/Project/dashflow/docs/adr/ADR-015-permissions-consent-flow.md).
