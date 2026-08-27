# Changelog

Все значимые изменения в проекте **DashFlow** будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

---

## [2.0.0-stage1] - 2026-08-27

### Этап 1: Дизайн-система и Theme Engine (Глобальный рефакторинг)

#### Добавлено / Изменено:
1. **Тестовая инфраструктура и гейты качества:**
   - Настройка `vitest` + `jsdom` + React Testing Library + `@testing-library/user-event` с изоляцией и автоочисткой DOM (`tests/setup.ts`).
   - Конфигурация ESLint 9 (Flat Config `eslint.config.js`) со строгой типизацией (`no-explicit-any`), проверкой доступности (`jsx-a11y`) и Prettier (`.prettierrc.json`).
   - Автоматический контроль шкалы дизайн-системы (`scale.guard.test.ts`) против использования цветов вне палитры, произвольных z-index и нерегламентированных отступов.

2. **Трёхслойная система токенов и интеграция с Tailwind 4:**
   - `src/styles/tokens.css` и `src/styles/globals.css`:
     - Слой 1: Структурные токены (шкала `z-index` `--z-base`...`--z-toast`, радиусы, тайминги анимаций $\le 250$ ms, тени).
     - Слой 2: 24 семантических токена темы (`--dashflow-*`).
     - Слой 3: Псевдонимы обратной совместимости (`--color-*`, `--glass-*`, `--shadow-*`).
     - Мост в Tailwind 4 (`@theme`, `@theme inline`).
     - Поддержка `prefers-reduced-motion: reduce` для полного отключения анимаций.
     - Удаление внешних Google Fonts из `index.html` (переход на быстрые системные шрифты).

3. **Функциональный модуль цветовой математики (`src/core/theme/color.ts`):**
   - Чистые sRGB вычисления на структуре `Rgba` с нормализованными `[0, 1]` значениями.
   - Парсинг 3/4/6/8-значных HEX, `rgb()`, `rgba()`.
   - Относительная яркость (Relative Luminance) и контраст по формуле WCAG 2.1.
   - Операция сплющивания альфа-канала `flatten(fg, bg)` для достоверного замера контраста на полупрозрачных поверхностях.

4. **Генератор токенов и эталонные пресеты (`src/core/theme/tokens.ts`, `presets.ts`):**
   - Контракт `ThemeTokens` (7 обязательных, 17 автоматически вычисляемых).
   - Чистая функция `resolveTheme` (отказ целиком при некорректных данных с откатом на Neutral Dark).
   - Генератор CSS-переменных `buildThemeCss`.
   - 9 встроенных пресетов (Neutral Dark, Deep Blue, Default Light, Midnight Purple, Ocean Teal, Minimal Monochrome, Aurora Emerald, Glass, High Contrast) с верифицированным контрастом WCAG AA/AAA.

5. **Безопасность пользовательского CSS и обоев (`src/core/theme/cssValidator.ts`, `wallpaper.ts`):**
   - Валидация пользовательского CSS: лимит 50 000 символов, безусловная блокировка `@import`, блокировка небезопасных протоколов в `url()`, тумблер `allowExternalCss` для HTTPS, очистка комментариев.
   - Санитизация обоев: разрешение только `https:`, `data:`, `chrome-extension:`, автоматический расчет затемнения (`scrim` от 0.0 до 0.9).

6. **Монтирование в DOM, версионирование и Zustand Store (`applyTheme.ts`, `migrations.ts`, `themeStore.ts`):**
   - `applyTheme.ts`: единственный модуль прямого управления тегами `<style id="dashflow-theme">` и `<style id="dashflow-custom-css">`, установка `data-theme` и переменных `--app-bg-image` / `--app-scrim`.
   - `migrations.ts`: авто-миграция legacy-состояния v1 $\to$ v2 (переименование `default-dark` в `deep-blue`).
   - `themeStore.ts`: реактивный стор Zustand для управления темой и автоматической синхронизации с DOM.

7. **Библиотека доступных UI компонентов (`src/ui/`):**
   - **Primitives (`src/ui/primitives/`):** `Button`, `Input`, `Switch` (нативный `<button role="switch">`), `Slider`, `Tooltip`, `Badge` с зоной нажатия $\ge 44 \times 44$ px.
   - **Overlays (`src/ui/overlays/`):** `Modal`, `Drawer`, `Dropdown` и хук `useFocusTrap` (удержание фокуса, Escape, возврат фокуса).
   - **Feedback (`src/ui/feedback/`):** `Spinner` (`role="status"`), `Skeleton` (`aria-hidden`), `EmptyState`, `ErrorState` (`role="alert"`).
   - **Appearance Feature (`src/features/appearance/`):** `AppearanceModal`, `PresetGrid`, `WallpaperPicker`, `CustomCssEditor`.

8. **Очистка legacy кода:**
   - Полное удаление устаревших каталогов `src/components/ui/` и `src/features/themes/`.
   - Перевод всех потребителей (виджеты Todo, Pomodoro, Bookmarks, RSS, Toolbar, Modal-окна, App) на новые модули `@/ui/` и `@/core/theme`.

#### Изменённые / созданные файлы:
- `src/styles/tokens.css` [NEW]
- `src/styles/globals.css` [MODIFY]
- `src/ui/lib/cn.ts` [NEW]
- `src/core/theme/color.ts` [NEW]
- `src/core/theme/tokens.ts` [NEW]
- `src/core/theme/presets.ts` [NEW]
- `src/core/theme/cssValidator.ts` [NEW]
- `src/core/theme/wallpaper.ts` [NEW]
- `src/core/theme/applyTheme.ts` [NEW]
- `src/core/theme/migrations.ts` [NEW]
- `src/core/theme/themeStore.ts` [NEW]
- `src/ui/primitives/*` [NEW]
- `src/ui/overlays/*` [NEW]
- `src/ui/feedback/*` [NEW]
- `src/features/appearance/*` [NEW]
- `src/entrypoints/newtab/App.tsx` [MODIFY]
- `src/components/ui/*` [DELETE]
- `src/features/themes/*` [DELETE]
- `docs/THEME_ENGINE_ARCHITECTURE.md` [MODIFY]
- `docs/adr/ADR-004-pure-color-math.md` [NEW]
- `docs/adr/ADR-005-three-layer-tokens.md` [NEW]
- `docs/adr/ADR-007-custom-css-security.md` [NEW]
- `tests/unit/**/*` [NEW]
- `tests/component/**/*` [NEW]

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

---

## [1.1.0-release] - 2026-08-11

### Добавлено / Исправлено
- Удаление мок-данных из галереи.
- Конструктор кастомных тем и CSS Редактор.
- Редизайн поиска Spotlight.
- Закладки 1x1 и RSS ленты.
