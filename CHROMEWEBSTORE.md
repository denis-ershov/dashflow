# Chrome Web Store Listing — DashFlow

> Last Updated: 2026-10-30
>
> Единый источник данных для Chrome Developer Dashboard (и AMO). Обновлять при каждом изменении
> манифеста, прав, обработки данных или интерфейса. Тексты для магазина — на английском (основной
> язык листинга) и русском (локализованный листинг).

## Store Listing

**Extension Name**
`__MSG_extensionName__` → en: «DashFlow — Personal Start Page», ru: «DashFlow — Персональный Dashboard»
(`src/public/_locales/{en,ru}/messages.json`).

**Short Description** (≤ 132 символа, совпадает с `extensionDescription`)
- en: Personal customizable dashboard and productivity new tab page for your browser.
- ru: Персональное рабочее пространство и Dashboard в новой вкладке браузера.

**Detailed Description — en**

```text
DashFlow replaces your new tab page with a customizable dashboard of widgets: clock, weather, search, tasks, habits, notes, bookmarks, RSS news, Pomodoro timer, quotes and more.

Features
Drag and resize widgets on a free-form grid that fills the whole screen.
Keep tasks, habits and notes right where you open every new tab.
See the weather for your city, with automatic location or a city you choose.
Read RSS and Atom feeds grouped into folders, in one timeline or per source.
Open bookmarks, open tabs and recently closed tabs as visual tiles.
Pick a theme, wallpaper and glass effect; switch between light and dark.
Find anything with the command palette (Ctrl+K) and search engines of your choice.
Export everything — layout, theme, tasks, notes and links — to a file and restore it on another computer.
Available in English and Russian.

How to use
1. Open a new tab — DashFlow appears with a starter layout.
2. Click "Edit" in the dock to add, move or resize widgets.
3. Open a widget's settings to configure it.

Privacy
Everything you enter stays in your browser. No accounts, no ads, no analytics or tracking.
Bookmarks, tabs and access to feed sites are optional: DashFlow asks only when you turn on the feature that needs them.

Support
Report issues at https://github.com/denis-ershov/dashflow/issues
```

**Detailed Description — ru**

```text
DashFlow превращает новую вкладку в настраиваемую панель виджетов: часы, погода, поиск, задачи, привычки, заметки, закладки, новости RSS, таймер Pomodoro, цитаты и другие.

Возможности
Перетаскивайте виджеты и меняйте их размер на сетке во весь экран.
Задачи, привычки и заметки всегда под рукой — в каждой новой вкладке.
Погода для вашего города: по местоположению или для выбранного города.
Ленты RSS и Atom с папками — единой лентой или по источникам.
Закладки, открытые и недавно закрытые вкладки в виде плиток.
Темы, обои и эффект стекла, светлое и тёмное оформление.
Командная палитра (Ctrl+K) и поиск в выбранных поисковиках.
Экспорт раскладки, темы, задач, заметок и ссылок в файл и восстановление на другом компьютере.
Интерфейс на русском и английском.

Как пользоваться
1. Откройте новую вкладку — появится стартовая раскладка.
2. Нажмите «Редактировать» в доке, чтобы добавлять, двигать и менять размер виджетов.
3. Откройте настройки виджета, чтобы настроить его.

Конфиденциальность
Всё, что вы вводите, хранится в браузере. Без аккаунтов, рекламы, аналитики и слежки.
Закладки, вкладки и доступ к сайтам лент необязательны: DashFlow спрашивает разрешение, только когда вы включаете функцию, которой оно нужно.

Поддержка
Сообщить о проблеме: https://github.com/denis-ershov/dashflow/issues
```

**Category:** Productivity

**Single Purpose:** Replaces the new tab page with a customizable dashboard of personal widgets (tasks, notes, weather, news, bookmarks).

**Primary Language:** English (локализация: Russian)

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `src/public/icons/icon-128.png` |
| Screenshot 1 — дашборд | 1280×800 | ✅ Ready | `docs/store/en-1-dashboard.png` (ru: `ru-1-dashboard.png`) |
| Screenshot 2 — командная палитра | 1280×800 | ✅ Ready | `docs/store/en-2-command-palette.png` (ru: `ru-2-…`) |
| Screenshot 3 — темы оформления | 1280×800 | ✅ Ready | `docs/store/en-3-appearance.png` (ru: `ru-3-…`) |
| Screenshot 4 | 1280×800 | ⬜ Not created | |
| Screenshot 5 | 1280×800 | ⬜ Not created | |
| Small Promo Tile | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes
Генерируются скриптом: `npm run build:chrome && npm run screenshots` (`scripts/store-screenshots.mjs`).
Стартовая раскладка без личных данных, тёмная тема; ответ Open-Meteo подставляется примером, чтобы
снимки не зависели от сети и погоды. Перед релизом с изменениями интерфейса — переснять.
Виджет «Закладки» в кадр не попадает: без выданного права он показывает запрос доступа.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Saves the user's dashboard layout, theme, widget settings, tasks, habits, notes and quick links locally in the browser so they are there on every new tab. |
| `https://api.open-meteo.com/*` | host_permissions | The Weather widget downloads the forecast for the user's city from Open-Meteo. |
| `https://geocoding-api.open-meteo.com/*` | host_permissions | The Weather widget's city search: turns the city name the user types into coordinates for the forecast. |
| `https://api.bigdatacloud.net/*` | host_permissions | Shows the city name for the user's location in the Weather widget when automatic location is on. |
| `https://nominatim.openstreetmap.org/*` | host_permissions | Fallback for showing the city name for the user's location in the Weather widget when the primary service is unavailable. |
| `bookmarks` | optional_permissions | Requested only when the user clicks "Allow access" in the Bookmarks widget: shows browser bookmarks as tiles and lets the user add, rename and delete them from the dashboard. |
| `tabs` | optional_permissions | Requested only when the user opens the "Open tabs" view of the Bookmarks widget: shows titles and addresses of open tabs and lets the user switch to them or save them as bookmarks. |
| `sessions` | optional_permissions | Requested only when the user opens the "Recently closed" view of the Bookmarks widget: lists recently closed tabs and restores the one the user clicks. |
| `https://*/*`, `http://*/*` | optional_host_permissions | Never granted as a whole. When the user adds an RSS feed and clicks "Allow access", DashFlow requests access only to that feed's site (e.g. `https://example.com/*`) to download the feed, which the site would otherwise block for an extension page. Pages of these sites are never read or modified. |

Не запрашиваются: `geolocation` (браузер сам спрашивает согласие при автоопределении города),
`<all_urls>`, content scripts, `scripting`, `history`, `cookies`.

**Remote code:** No. Весь код в пакете; плагины — декларативные JSON-манифесты, код плагинов
исполняется только в sandbox-странице без доступа к API расширения.

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes — только для работы функций, на устройстве пользователя.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | — | — | No |
| Health info | No | — | — | No |
| Financial info | No | — | — | No |
| Authentication info | No | — | — | No |
| Personal communications | No | — | — | No |
| Location | Yes (по согласию) | Yes — координаты отправляются в Open-Meteo / BigDataCloud / Nominatim | Прогноз погоды и название города | Только этим сервисам для ответа на запрос |
| Web history | Yes (по согласию) | No | Показ открытых и недавно закрытых вкладок в виджете | No |
| User activity | No | — | — | No |
| Website content | Yes (тексты заметок, задач, адреса ссылок и лент, которые вводит пользователь) | No | Хранение содержимого виджетов | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL:** https://github.com/denis-ershov/dashflow/blob/main/PRIVACY_EN.md
(ru: `PRIVACY.md`). Репозиторий должен быть публичным, иначе ссылка не откроется у ревьюеров.

## Distribution

**Visibility:** Public (решение владельца — см. `docs/ROADMAP_2026-10-30.md`, раздел 4)
**Regions:** All regions

## Developer Info

**Publisher Name:** Denis Ershov
**Contact Email:** [заполнить перед отправкой — публичный адрес, который читается]
**Support URL:** https://github.com/denis-ershov/dashflow/issues
**Homepage URL:** https://github.com/denis-ershov/dashflow

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 3.8.0 | 2026-10-30 | Необязательные права вместо доступа ко всем сайтам; локализованное название; редизайн, локализация en, экспорт содержимого виджетов, сетка на всю ширину | Draft |

## Review Notes

### Known Issues / Limitations
- При первом открытии виджета RSS с лентами по умолчанию показывается запрос доступа к их сайтам — это ожидаемо.
- Автоопределение города использует стандартный запрос браузера; при отказе виджет предлагает выбрать город вручную.
- Firefox (AMO): пакет MV2, те же права; хосты лент входят в `optional_permissions`. Объявлено `data_collection_permissions.required: ["locationInfo"]` — погода отправляет координаты в Open-Meteo и геокодеры.

### Rejection History
Нет.
