# Архитектура хранилища и миграций (Storage & Migrations Architecture)

## 1. Введение и назначение

Модуль `@/core/storage` отвечает за надёжное сохранение настроек, макетов сетки дашборда и пользовательских данных как в среде расширения Chrome (`chrome.storage.local`), так и в стандартном веб-окружении (`localStorage`, `IndexedDB`).

---

## 2. Структура модуля

```
src/core/storage/
├── keys.ts                # STORAGE_KEYS (реестр констант ключей и резервных копий)
├── errors.ts              # Типизированные ошибки (StorageQuotaExceededError, StorageError)
├── StorageAdapter.ts      # Универсальный адаптер сохранения и чтения
├── dashboardMigrations.ts # Чистые функции миграции состояния v1 -> v2 и адаптивных раскладок
└── index.ts               # Единый реэкспорт
```

---

## 3. Реестр ключей хранилища

Все ключи строго типизированы и определены в `STORAGE_KEYS`:
- `DASHBOARD`: `'dashflow_dashboard_store'` — основное состояние дашборда.
- `DASHBOARD_BACKUP_V1`: `'dashflow_backup_v1'` — резервная копия состояния v1 перед миграцией (Правило 51).
- `THEME`: `'dashflow_theme_store'` — настройки темы.
- `THEME_BACKUP_V1`: `'dashflow_theme_backup_v1'` — резервная копия темы v1.
- `APP_SETTINGS`: `'dashflow_app_settings'` — глобальные настройки приложения.
- `WALLPAPER_BLOB`: `'dashflow_wallpaper_blob'` — пользовательские обои (IndexedDB).
- `WEATHER_CACHE`: `'dashflow_weather_cache'` — кеш метеоданных (IndexedDB).
- `PLUGIN_DATA_PREFIX`: `'dashflow_plugin_'` — префикс изолированных данных сторонних плагинов.

---

## 4. Обработка квот и больших данных (Правило 25)

- Для небольших конфигурационных структур используется `StorageAdapter.get` / `StorageAdapter.set`.
- Для больших бинарных данных (обои, кеш) реализованы `setLarge` / `getLarge`, использующие `IndexedDB` (`idb`).
- При переполнении квоты распознаются коды ошибок браузера (код 22, 1014, имя `QuotaExceededError`) и выбрасывается `StorageQuotaExceededError`, предотвращая скрытое повреждение данных.

---

## 5. Миграция Dashboard Store v1 $\to$ v2

- Состояние v1 хранило плоский массив `widgets` с фиксированными координатами `x`, `y`, `w`, `h` для одной сетки 12 колонок.
- Состояние v2 разделяет `instances` (идентификаторы и настройки) и `layouts` (адаптивные раскладки для 5 брейкпоинтов: `xl`, `lg`, `md`, `sm`, `xs`).
- Функция `deriveResponsiveLayouts(baseLayout, baseCols)` автоматически рассчитывает плотную адаптивную сетку для мобильных и планшетных устройств, гарантируя отсутствие горизонтального скролла (Правила 8–10).
