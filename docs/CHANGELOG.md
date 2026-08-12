# Changelog

Все значимые изменения в проекте **DashFlow** будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

---

## [1.2.0-release] - 2026-08-11

### Добавлено / Исправлено (Hitab UI, Interactive Grid Engine, RSS Multi-Mix, Bookmarks 2-Way Sync)
1. **Дизайн в стиле Hitab (web.hitab.me) & SuperStart:**
   - Премиальная эстетика с радиальными свечениями, матовым стеклом `backdrop-blur-2xl`, тонкими переливами границ и отсутствием нагромождения контролов.
2. **Интерактивный Drag & Drop / Resize Движок Сетки:**
   - Интегрирована библиотека `react-grid-layout` для честного физического перетаскивания мышью и ресайза виджетов с угловыми ухваточными ручками в режиме `Edit Layout`.
3. **Очищенный Фронтенд RSS & Мульти-микс Чекбоксами:**
   - Фронтенд карточки RSS полностью очищен от выпадающих списков.
   - Все настройки вынесены в `RssSettingsForm` в выкатной `Drawer`. Выбор нескольких каналов **чекбоксами** объединяет их новости в единый общий хронологический поток.
4. **Закладки по 100% спецификации (3 Режима):**
   - **Одиночная закладка:** отдельный элемент со своими настройками тумблеров.
   - **Внутренняя папка:** добавление закладок вручную.
   - **Синхронизация с папой Chrome:** реальная двусторонняя синхронизация через `chrome.bookmarks.onCreated`, `onRemoved`, `onChanged`, `onMoved` без зацикливания sync-потоков. Chrome остается источником данных, а расширение хранит настройки стиля представления (Плитка, Список, Таблица) отдельно.

### Измененные файлы
- `package.json` [MODIFY]
- `src/styles/globals.css` [MODIFY]
- `src/stores/useDashboardStore.ts` [MODIFY]
- `src/features/dashboard/components/GridEngine.tsx` [MODIFY]
- `src/features/dashboard/components/WidgetCard.tsx` [MODIFY]
- `src/plugins/rss-reader/RssWidget.tsx` [MODIFY]
- `src/plugins/rss-reader/RssSettingsForm.tsx` [NEW]
- `src/services/storage/ChromeBookmarksSync.ts` [NEW]
- `src/widgets/built-in/BookmarksWidget/BookmarksWidget.tsx` [MODIFY]
- `src/widgets/built-in/BookmarksWidget/SingleBookmarkTile.tsx` [MODIFY]
- `src/widgets/built-in/BookmarksWidget/BookmarksSettingsForm.tsx` [NEW]
- `src/features/dashboard/components/WidgetSettingsDrawer.tsx` [MODIFY]
- `docs/CHANGELOG.md` [MODIFY]

---

## [1.1.0-release] - 2026-08-11

### Добавлено / Исправлено
- Удаление мок-данных из галереи.
- Конструктор кастомных тем и CSS Редактор.
- Редизайн поиска Spotlight.
- Закладки 1x1 и RSS ленты.
