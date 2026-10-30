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
│  Права браузера & Data Minimization                         │
│  - При установке: storage + хосты погоды/геокодинга         │
│  - По клику: bookmarks, tabs, sessions, сайты RSS-лент      │
│    (optional_permissions / optional_host_permissions)       │
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
3. **Изоляция хранилища и строгая проверка прав:** Каждый плагин имеет доступ только к ключам своего пространства имен. Мост `SandboxBridge` валидирует наличие разрешения `storage` через `PermissionManager` перед операциями чтения/записи; неавторизованные попытки отклоняются с ошибкой.

---

## 3. Права браузера

| Право | Когда выдаётся | Кто запрашивает |
|---|---|---|
| `storage`, хосты Open-Meteo, BigDataCloud, Nominatim | При установке | Манифест |
| `bookmarks` | Кнопка «Разрешить доступ» в виджете «Закладки» (источник — закладки браузера) | `useBrowserPermissions` |
| `tabs` | Вкладка «Открытые» виджета «Закладки» | `useBrowserPermissions` |
| `sessions` + `tabs` | Вкладка «Недавно закрытые» | `useBrowserPermissions` |
| Сайты RSS-лент (`https://host/*`) | Кнопка «Разрешить доступ» в виджете RSS — только хосты включённых лент | `useBrowserPermissions` |
| Геолокация | Стандартный запрос браузера при автоопределении города (в манифест не входит: в Chrome это право не может быть необязательным) | `navigator.geolocation` |

`src/core/permissions/browserPermissions.ts`: запрос вызывается синхронно из обработчика клика (иначе браузер теряет жест пользователя); хук следит за `permissions.onAdded/onRemoved`, поэтому отзыв права в настройках браузера сразу возвращает виджет в состояние «нужен доступ». Вне расширения (dev, тесты) права считаются выданными.

## 3.1. Права плагинов (ADR-015)

- Чувствительные разрешения (`network`, `bookmarks`, `geolocation`) запрашиваются через `PermissionConsentModal` перед активацией.
- При установке плагина из каталога права регистрируются автоматически, а при удалении плагина — полностью отзываются (`PermissionManager.revokePermissions`).
- Отзыв разрешений доступен пользователю в любое время.

---

## 4. Защита от Утечек, XSS и SSRF

1. **Санитаризация Пользовательского CSS (`cssValidator.ts`):** Блокировка `@import`, внешних шрифтов без разрешения и устаревших XSS-векторов.
2. **Санитаризация Обоев (`wallpaper.ts`):** Валидация протоколов `https:`, `chrome-extension:`, `data:` и экранирование кавычек.
3. **Безопасные ссылки в RSS и Iframe:** Проверка схемы `isSecureUrl()` (только `https:`).
4. **Фоновый воркер и RSS-прокси (`background.ts`, `src/core/network/feedProxy.ts`):** проверка приватных адресов до запроса и после редиректов, лимит 2 МБ, таймаут 10 с, коды ошибок без деталей, только сообщения от самого расширения. Подробно — `PLUGINS_AND_SECURITY_ARCHITECTURE.md`, раздел 5.
5. **Конфиденциальность в логах:** В логах `RootErrorBoundary` и `WidgetShell` не выводятся пользовательские настройки и токены.

---

## 5. Дополнительная документация

- Подробности: [PLUGINS_AND_SECURITY_ARCHITECTURE.md](file:///e:/DEV/Project/dashflow/docs/PLUGINS_AND_SECURITY_ARCHITECTURE.md)
- Решения: [ADR-007](file:///e:/DEV/Project/dashflow/docs/adr/ADR-007-custom-css-security.md), [ADR-014](file:///e:/DEV/Project/dashflow/docs/adr/ADR-014-declarative-plugins-and-sandbox-bridge.md), [ADR-015](file:///e:/DEV/Project/dashflow/docs/adr/ADR-015-permissions-consent-flow.md).
