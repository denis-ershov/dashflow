# Архитектура Виджетов и Реестра (Widget Engine & Catalog Architecture)

## 1. Обзор Виджетов и Ленивой Загрузки

В **DashFlow 2.0** каждый виджет полностью изолирован, обладает типизированным манифестом (`WidgetManifest`), схемой настроек (`settingsSchema`) и загружается асинхронно по требованию (Code Splitting via `load: () => import(...)`, ADR-008, ADR-011, ADR-012).

```text
┌─────────────────────────────────────────────────────────────┐
│                    Widget Engine 2.0                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ WidgetRegistry (12 Встроенных Виджетов + Плагины)     │  │
│  │ - Ленивая загрузка (dynamic import)                   │  │
│  │ - Code Splitting (минимальный начальный бандл)        │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│         ┌────────────────────┴────────────────────┐         │
│         ▼                                         ▼         │
│  WidgetShell (ErrorBoundary,               WidgetSettingsDrawer
│  Loading, Error, No-Permission,            (Универсальная   │
│  3 Поверхности: card, panel, transparent)   панель настроек)│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 12 Встроенных Виджетов DashFlow

1. **`ClockWidget`:** Цифровые часы, дата, режим 12/24ч, секунды, часовые пояса.
2. **`WeatherWidget`:** Погода от Open-Meteo, геолокация или ручной ввод города, единицы °C/°F.
3. **`SearchWidget`:** Мультипоисковая строка (Google, DuckDuckGo, Yandex, Bing, Ecosia, Kagi).
4. **`TodoWidget`:** Управление задачами, списки, фильтры, сроки, приоритеты.
5. **`NotesWidget`:** Текстовый редактор заметок с автосохранением в `StorageAdapter`.
6. **`QuickLinksWidget`:** Быстрые ссылки с фавиконками и кастомными названиями.
7. **`BookmarksWidget`:** Интеграция с закладками Chrome (`chrome.bookmarks`).
8. **`IframeWidget`:** Безопасное встраивание веб-страниц через HTTPS.
9. **`PomodoroWidget`:** Таймер продуктивности Pomodoro (25/5/15 мин, звук, уведомления).
10. **`QuotesWidget`:** Вдохновляющие цитаты с возможностью добавления своих.
11. **`SystemMonitorWidget`:** Индикатор батареи, типа сети и производительности.
12. **`RssWidget`:** RSS-ридер с валидацией HTTPS ссылок и выбором режимов просмотра.

---

## 3. Схема Настроек (`settingsSchema`) и Валидация

- Все поля настроек виджетов описываются декларативно (`text`, `number`, `boolean`, `select`).
- Валидация выполняется через `validateWidgetSettings()` перед сохранением в `StorageAdapter`.
- Изменения настроек в `WidgetSettingsDrawer` мгновенно применяются к экземпляру виджета.

---

## 4. Дополнительная документация

- Каталог виджетов: [WIDGET_CATALOG_ARCHITECTURE.md](file:///e:/DEV/Project/dashflow/docs/WIDGET_CATALOG_ARCHITECTURE.md)
- Контракты виджетов: [WIDGET_CONTRACTS_ARCHITECTURE.md](file:///e:/DEV/Project/dashflow/docs/WIDGET_CONTRACTS_ARCHITECTURE.md)
- Решения: [ADR-008](file:///e:/DEV/Project/dashflow/docs/adr/ADR-008-widget-contracts.md), [ADR-011](file:///e:/DEV/Project/dashflow/docs/adr/ADR-011-widget-shell-resilience.md), [ADR-012](file:///e:/DEV/Project/dashflow/docs/adr/ADR-012-widget-code-splitting.md).
