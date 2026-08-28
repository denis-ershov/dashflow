# Архитектура каталога и встроенных виджетов DashFlow

## 1. Структура компонентов и каталог 12 виджетов

Все 12 встроенных виджетов переведены на модульную структуру манифестов с динамическим импортом (`load: () => import(...)`):

| Идентификатор | Название (i18n) | Категория | Поверхность | Разрешения | Описание |
|---|---|---|---|---|---|
| `clock` | `widgets.clock` | `utilities` | `chromeless` | — | Цифровые часы и дата с Intl форматированием 12/24ч, секунды и выбор шрифта |
| `search` | `widgets.search` | `utilities` | `chromeless` | — | Поисковая строка Spotlight с переключателями систем (Google, Yandex, DuckDuckGo, Bing, YouTube, GitHub) |
| `weather` | `widgets.weather` | `utilities` | `panel` | `network`, `storage`, `geolocation` | Умная метеостанция 3.0 с авто-геолокацией, 4 макетами (dashboard, compact, hourly, weekly), 24ч прогнозом, 7-дневными Apple-style термо-барами, сеткой атмосферных метрик и кастомными настройками |
| `todo` | `widgets.todo` | `productivity` | `panel` | `storage` | Менеджер задач 2.0 со счетчиком прогресса дня, очисткой выполненных, приоритетами и фильтрами |
| `notes` | `widgets.notes` | `productivity` | `panel` | `storage` | Заметки Pro с переключением Правка / Markdown предпросмотр, счетчиком слов и символов |
| `quickLinks` | `widgets.quickLinks` | `productivity` | `tiles` | `storage` | Плитки быстрых ссылок со стеклянным нео-оформлением и авто-фавиконками |
| `bookmarks` | `widgets.bookmarks` | `productivity` | `tiles` | `bookmarks` | Закладки Chrome с иерархией папок и Mobile First раскладкой |
| `iframe` | `widgets.iframe` | `utilities` | `panel` | `network` | Встраивание безопасных HTTPS сайтов с изоляцией песочницы |
| `pomodoro` | `widgets.pomodoro` | `productivity` | `panel` | `storage` | Pomodoro таймер с гармоническим колоколом процедурного синтеза Web Audio API |
| `quotes` | `widgets.quotes` | `entertainment` | `panel` | — | Цитата дня (10 вдохновляющих высказываний) с копированием в буфер обмена |
| `systemMonitor` | `widgets.systemMonitor` | `developer` | `panel` | — | Индикаторы сети, уровня батареи (Battery API), счетчика вкладок Chrome и памяти JS Heap |
| `rssReader` | `widgets.rssReader` | `news` | `panel` | `network`, `storage` | RSS ридер с единым хронологическим потоком, фавиконками источников и санитизацией |

---

## 2. Изоляция сбоев и WidgetShell 2.0

Каждый виджет на дашборде оборачивается в компонент `WidgetShell` (`src/core/widget/WidgetShell.tsx`), который:
1. Предоставляет изолированный `WidgetErrorBoundary`, перехватывающий любые исключения во время рендеринга виджета без падения всего дашборда.
2. Безопасно логирует стек вызовов ошибки без раскрытия пользовательских настроек (Секция 10).
3. Обеспечивает отображение одной из трех поверхностей: `chromeless`, `panel` (нео-стекло `.glass-card`), `tiles`.
4. Инкапсулирует элементы управления режима редактирования (ручка перетаскивания `GripVertical`, кнопка настроек, кнопка удаления).

---

## 3. Безопасность и валидация ввода

1. **Iframe Security:** Запрещен флаг `allow-same-origin` в песочнице `sandbox="allow-scripts allow-forms allow-popups"`. Запрещены потенциально опасные схемы URL (`javascript:`, `data:`, `file:`, `chrome:`).
2. **RSS Pipeline Security:** Все ссылки новостей валидируются на протоколы `https:` и `http:`. Тег `img` для превью картинок использует `referrerPolicy="no-referrer"`.
3. **Хранилище:** Ключи виджетов централизованы в `STORAGE_KEYS` (`TODO_ITEMS`, `NOTES_CONTENT`, `QUICK_LINKS`, `WEATHER_CACHE`).
