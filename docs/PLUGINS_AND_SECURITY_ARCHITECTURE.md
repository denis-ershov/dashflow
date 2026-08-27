# Архитектура плагинов, каталога и безопасности (Plugins, Marketplace & Security Architecture)

## 1. Декларативная система плагинов (Manifest V3 Compliance)

В соответствии с правилами безопасности Chrome Web Store и политикой Manifest V3 (запрет Remote Code Execution, ADR-001, ADR-014), плагины в DashFlow являются **исключительно декларативными JSON-манифестами**.

### Типы декларативных плагинов:
1. `rss`: новостная лента (URL фида, настройки пагинации и отображения картинок).
2. `embed`: встраиваемый безопасный HTTPS-ресурс (калькулятор, трекер, документация).
3. `links`: набор закладок и быстрых ссылок с фавиконками.
4. `api`: шаблонный API-виджет для отображения внешних REST JSON данных с интервальным обновлением.

### Валидация манифестов (`validatePluginManifest`):
- Строгая проверка формата ID (`^[a-zA-Z0-9_-]{2,32}$`).
- Запрет небезопасных протоколов (`http:`, `javascript:`, `data:`, `file:`) — разрешен только `https:`.
- Ограничение размеров ячеек ($1 \le W, H \le 24$).
- Валидация списка требуемых прав доступа (`storage`, `network`, `bookmarks`, `geolocation`).

---

## 2. Безопасность песочницы (`SandboxBridge`)

Каркас песочницы `PluginHost` использует изолированный тег `<iframe>` с политикой:
- `sandbox="allow-scripts"` (СТРОГО без `allow-same-origin`, origin равен `'null'`).
- Защита RPC-моста:
  1. Проверка `event.source === iframe.contentWindow` для исключения перехвата чужих сообщений.
  2. Изоляция ключей хранилища: `STORAGE_KEYS.PLUGIN_DATA_PREFIX + pluginId + '_' + key`.
  3. Проверка ключей на Path Traversal (`^[a-zA-Z0-9_-]{1,64}$`).
  4. Проверка выданных разрешений перед выполнением операций `STORAGE_GET`/`STORAGE_SET`.

---

## 3. Модель разрешений (Permissions Consent Flow, ADR-015)

1. **Гранулярные разрешения:**
   - `storage` — локальное изолированное хранилище (нечувствительное).
   - `network` — HTTPS-запросы к внешним API (чувствительное).
   - `bookmarks` — доступ к закладкам браузера (чувствительное).
   - `geolocation` — доступ к координатам (чувствительное).
2. **Диалог согласия (`PermissionConsentModal`):**
   - При попытке установки виджета или плагина, требующего чувствительных прав, пользователю отображается модальное окно с детальным описанием рисков.
   - Выданные согласия персистентно сохраняются в `STORAGE_KEYS.PERMISSION_GRANTS`.
   - Возможность отзыва прав в любое время.

---

## 4. Политика безопасности контента (Content Security Policy)

В `wxt.config.ts` настроена строгая политика:
- `extension_pages`: `script-src 'self'; object-src 'self'; frame-src https: 'self';`
- `sandbox`: `sandbox allow-scripts; script-src 'self'; object-src 'none';`
- `host_permissions` ограничены доверенными эндпоинтами (`api.open-meteo.com`, `images.unsplash.com`).
