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
  4. Строгая проверка разрешений: операции `STORAGE_GET` и `STORAGE_SET` выполняются исключительно при подтверждённом наличии разрешения `storage` через `PermissionManager.hasPermission(pluginId, 'storage')`. Несанкционированный доступ немедленно отклоняется с ошибкой.

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
3. **Автоматическое управление жизненным циклом прав (`pluginStore`):**
   - При установке плагина из каталога (`installPlugin`) права из манифеста регистрируются через `PermissionManager.grantPermissions(plugin.id, plugin.permissions)`.
   - При удалении плагина (`uninstallPlugin`) все выданные ему права автоматически отзываются через `PermissionManager.revokePermissions(pluginId)`.

---

## 4. Политика безопасности контента (Content Security Policy)

В `wxt.config.ts` настроена строгая политика:
- `extension_pages`: `script-src 'self'; object-src 'self'; frame-src https: 'self';`
- `sandbox`: `sandbox allow-scripts; script-src 'self'; object-src 'none';`
- Обязательные `host_permissions` — только сервисы погоды и геокодинга. Доступ к сайтам RSS-лент — `optional_host_permissions`, запрашивается по клику только для адресов лент (`src/core/permissions/browserPermissions.ts`).

---

## 5. Безопасность Background Service Worker (`background.ts`)

Фоновый процесс проксирует загрузку RSS-лент (страница новой вкладки не может читать их из-за CORS) и обрабатывает системные события:
1. **Контракт сообщений** (`src/core/network/feedProxy.ts`): единственный тип `FETCH_RSS_FEED`, форма проверяется `isBackgroundRequest`, ответ — `{ success, xml }` или код ошибки (`FORBIDDEN_URL`, `HTTP_ERROR`, `TOO_LARGE`, `TIMEOUT`, `NETWORK`, `BAD_REQUEST`, `FORBIDDEN_SENDER`) без текста исключений.
2. **Защита от SSRF** (`isPublicHttpUrl`): только `http(s)` без логина/пароля в URL; отклоняются `localhost`, `*.localhost`, `*.local`, `*.internal`, `*.lan`, `*.home.arpa`, IPv4 `0/8`, `10/8`, `127/8`, `100.64/10`, `169.254/16`, `172.16/12`, `192.168/16`, `224+`, IPv6 `::`, `::1`, `::ffff:*`, `fc00::/7`, `fe80::/10`. Десятичная и шестнадцатеричная запись IPv4 нормализуется `URL` и тоже отсекается. Адрес проверяется до запроса и после редиректов (`response.url`).
3. **Лимиты:** таймаут 10 с, ответ ≤ 2 МБ (по `Content-Length` и по факту чтения), `credentials: 'omit'`.
4. **Остаточный риск:** DNS-имя, указывающее на приватный IP (DNS rebinding), так не отсечь. Его ограничивают права на хосты: они выдаются только к сайтам лент пользователя.
5. **Валидация источника:** обрабатываются только сообщения с `sender.id === chrome.runtime.id`.
6. **Обновление:** при `onUpdateAvailable` флаг пишется в `storage.session`, а `runtime.reload()` вызывается, только когда не открыта ни одна вкладка DashFlow (`runtime.getContexts`), чтобы не потерять ввод.
7. **Обработка клика по иконке расширения:**
   - Слушатель `chrome.action.onClicked` открывает вкладку `newtab.html`, гарантируя удобный запуск дашборда из панели расширений.
