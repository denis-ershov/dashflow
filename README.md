<div align="center">

# ⚡ DashFlow

**Современный, адаптивный и расширяемый дашборд новой вкладки для браузера**  
*Создан на базе React 19, TypeScript, Tailwind CSS 4 и WXT (Chrome Manifest V3)*

[![Version](https://img.shields.io/badge/version-2.0.1-blue.svg?style=flat-square)](docs/CHANGELOG.md)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-green.svg?style=flat-square)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-orange.svg?style=flat-square)](wxt.config.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react&logoColor=black)](package.json)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](src/styles/globals.css)
[![Tests](https://img.shields.io/badge/Tests-537_Passed-success.svg?style=flat-square)](tests/)

[Возможности](#-основные-возможности) •
[Каталог виджетов](#-встроенные-виджеты) •
[Быстрый старт](#-быстрый-старт) •
[Архитектура](#-архитектура) •
[Горячие клавиши](#-горячие-клавиши) •
[Разработка](#-разработка) •
[Документация](#-документация)

</div>

---

## 🌟 Основные возможности

- **📱 Mobile First и полная адаптивность:** безупречно работает на любых экранах — от компактных смартфонов (iPhone SE) и планшетов до Ultra-Wide 4K мониторов.
- **🎨 Продвинутый Theme Engine (WCAG 2.1 AAA):** 9 встроенных контрастных пресетов, чистая sRGB математика цвета, кастомные обои с автозатемнением (`scrim`) и безопасный редактор Custom CSS с защитой от сетевых утечек.
- **🧩 12 встроенных виджетов:** модульные виджеты с асинхронной загрузкой (Code Splitting) и независимой изоляцией сбоев (`ErrorBoundary`).
- **🛡️ Безопасность Manifest V3:** декларативные JSON-плагины, изолированная песочница `iframe` (`sandbox="allow-scripts"` без `allow-same-origin`), строгий контроль разрешений (`PermissionManager`).
- **📐 Бесколлизионная сетка (React-Grid-Layout v2):** перетаскивание (Drag & Drop), изменение размеров, автоматическое вертикальное вытеснение и алгоритм поиска первого свободного слота.
- **⌨️ Доступность (A11y):** полная навигация с клавиатуры, управление фокусом, поддержка скринридеров (`aria-live`, `role`), минимальные зоны клика $\ge 44 \times 44\text{ px}$.
- **🌐 Встроенная мультиязычность:** реактивный i18n-движок с поддержкой русского и английского языков, параметрической интерполяцией и автоопределением локали браузера.
- **⚡ Молниеносная скорость:** локальное хранилище через `StorageAdapter`, кеширование запросов через `@tanstack/react-query`, оптимизированный размер бандла расширения (< 600 КБ).

---

## 📦 Встроенные виджеты

В DashFlow 2.0 включены 12 оптимизированных встроенных виджетов:

| Виджет | ID | Категория | Описание |
| :--- | :--- | :--- | :--- |
| **Часы** | `clock` | `utilities` | Цифровые часы с датой, 12/24ч форматом, секундами и Intl-форматированием |
| **Погода** | `weather` | `utilities` | Текущая погода и прогноз через Open-Meteo API с кешированием в IndexedDB |
| **Поиск** | `search` | `utilities` | Мультипоисковая строка (Google, Yandex, DuckDuckGo, Bing, GitHub, YouTube) |
| **Задачи** | `todo` | `productivity` | Список дел с фильтрацией (все/активные/завершенные) и локальным сохранением |
| **Заметки** | `notes` | `productivity` | Быстрый блокнот с автосохранением и дебаунсом |
| **Быстрые ссылки** | `quickLinks` | `productivity` | Визуальные плитки избранных сайтов с авто-фавиконками |
| **Закладки** | `bookmarks` | `utilities` | Быстрый доступ к закладкам браузера Chrome (требует разрешения) |
| **Веб-фрейм** | `iframe` | `entertainment` | Встраивание внешних веб-страниц в безопасной песочнице |
| **Помодоро** | `pomodoro` | `productivity` | Таймер фокуса (25/5/15 мин) со звуковым сигналом через Web Audio API |
| **Цитаты** | `quotes` | `entertainment` | Вдохновляющие цитаты с возможностью копирования в буфер обмена |
| **Системный монитор** | `systemMonitor` | `developer` | Мониторинг батареи (Battery API), онлайн-статуса и памяти |
| **RSS Ридер** | `rssReader` | `news` | Лента новостей с режимами отображения (миниатюры, компактный, карточки) |

---

## 🚀 Быстрый старт

### Установка в браузер (для пользователей)

1. Скачайте последний релиз из вкладки [Releases](../../releases).
2. Распакуйте архив в удобную папку.
3. Откройте в Chrome страницу расширений: `chrome://extensions/`.
4. Включите **«Режим разработчика»** (Developer mode) в правом верхнем углу.
5. Нажмите **«Загрузить распакованное расширение»** (Load unpacked) и выберите папку `.output/chrome-mv3`.
6. Откройте новую вкладку! 🎉

---

## 💻 Разработка

### Требования
- **Node.js:** `>= 20.0.0`
- **npm:** `>= 10.0.0`

### Установка зависимостей и запуск

```bash
# Клонирование репозитория
git clone https://github.com/your-username/dashflow.git
cd dashflow

# Установка зависимостей
npm install

# Запуск в режиме разработки с HMR (Hot Module Replacement)
npm run dev

# Проверка типов TypeScript
npm run compile

# Проверка линтером (ESLint 9)
npm run lint

# Запуск тестов (Vitest, 537 тестов)
npm test

# Релизная сборка расширения
npm run build
```

После `npm run build` готовое расширение для загрузки в Chrome будет скомпилировано в каталог `.output/chrome-mv3`.

---

## 🏗️ Архитектура

Проект построен по модульной архитектуре с четким разделением ответственности:

```text
dashflow/
├── src/
│   ├── core/                    # Ядро приложения (не зависит от конкретных UI-компонентов)
│   │   ├── storage/             # Фасад StorageAdapter, ключи, миграции схемы v1 -> v2
│   │   ├── theme/               # Theme Engine: 3-слойные токены, sRGB математика, валидатор CSS
│   │   ├── widget/              # Контракты WidgetDefinition, WidgetRegistry, валидаторы
│   │   ├── plugins/             # Декларативные плагины, SandboxBridge, RPC-мост
│   │   ├── permissions/         # Менеджер чувствительных разрешений (PermissionManager)
│   │   └── i18n/                # Движок мультиязычности (ru/en), useTranslation
│   ├── ui/                      # Дизайн-система DashFlow (Atomic Design, Tailwind 4)
│   │   ├── primitives/          # Button, Input, Switch, Slider, Tooltip, Badge
│   │   ├── overlays/            # Modal, Drawer, Dropdown, useFocusTrap
│   │   └── feedback/            # RootErrorBoundary, Spinner, Skeleton, EmptyState, ErrorState
│   ├── features/                # Бизнес-фичи приложения
│   │   ├── dashboard/           # Сетка GridEngine, WidgetShell, WidgetSettings, CommandPalette
│   │   ├── appearance/          # AppearanceModal, PresetGrid, WallpaperPicker, CustomCssEditor
│   │   ├── marketplace/         # MarketplaceModal, каталог плагинов, импорт JSON
│   │   ├── navigation/          # Каркас NavRail (Desktop: 64px rail, Mobile: 64px bar)
│   │   ├── permissions/         # Диалог согласия PermissionConsentModal
│   │   └── settings/            # SettingsModal, импорт/экспорт конфигурации
│   ├── widgets/built-in/        # 12 встроенных виджетов с ленивой загрузкой
│   └── entrypoints/newtab/      # Точка входа новой вкладки (main.tsx, App.tsx)
├── docs/                        # Архитектурная документация и ADR
├── tests/                       # Unit, Component и Integration тесты (Vitest, RTL)
└── wxt.config.ts                # Конфигурация расширения Chrome Manifest V3
```

Подробная архитектурная документация доступна в каталоге [`docs/`](docs/):
- 📘 [CORE_ARCHITECTURE.md](docs/CORE_ARCHITECTURE.md) — общая архитектура ядра
- 🎨 [THEME_ENGINE_ARCHITECTURE.md](docs/THEME_ENGINE_ARCHITECTURE.md) — система тем и токенов
- 📐 [LAYOUT_AND_NAVIGATION_ARCHITECTURE.md](docs/LAYOUT_AND_NAVIGATION_ARCHITECTURE.md) — сетка и навигация
- 🛡️ [SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md) — безопасность и песочница
- 🔌 [PLUGIN_SDK_ARCHITECTURE.md](docs/PLUGIN_SDK_ARCHITECTURE.md) — декларативные плагины
- 📦 [WIDGET_CATALOG_ARCHITECTURE.md](docs/WIDGET_CATALOG_ARCHITECTURE.md) — контракты виджетов
- 💾 [STORAGE_ARCHITECTURE.md](docs/STORAGE_ARCHITECTURE.md) — стратегия персистентности
- 🌐 [I18N_ARCHITECTURE.md](docs/I18N_ARCHITECTURE.md) — интернационализация

---

## ⌨️ Горячие клавиши

| Клавиши | Действие |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Открыть командную палитру (Command Palette) |
| <kbd>Ctrl</kbd> + <kbd>E</kbd> / <kbd>Cmd</kbd> + <kbd>E</kbd> | Включить / выключить режим редактирования сетки |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Навигация по интерактивным элементам дашборда |
| <kbd>Ctrl</kbd> + <kbd>Стрелки</kbd> | Перемещение виджета в режиме редактирования |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Стрелки</kbd> | Изменение размера виджета |
| <kbd>Esc</kbd> | Закрыть активное модальное окно или панель |

---

## 🛠️ Стек технологий

- **Фреймворк:** [React 19](https://react.dev/)
- **Сборщик расширения:** [WXT Framework](https://wxt.dev/) + [Vite 5](https://vitejs.dev/)
- **Стилизация:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Сетка и D&D:** [React-Grid-Layout v2](https://github.com/react-grid-layout/react-grid-layout)
- **Управление состоянием:** [Zustand 5](https://github.com/pmndrs/zustand) + [Immer](https://immerjs.github.io/immer/)
- **Асинхронные запросы:** [@tanstack/react-query v5](https://tanstack.com/query)
- **Иконки:** [Lucide React](https://lucide.dev/)
- **Тестирование:** [Vitest 2](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react)
- **Линтинг и форматирование:** [ESLint 9](https://eslint.org/) + [Prettier 3](https://prettier.io/)

---

## 🤝 Контрибьютинг

Мы приветствуем вклад сообщества! Перед созданием Pull Request, пожалуйста, ознакомьтесь с [Руководством по контрибьютингу](CONTRIBUTING.md).

1. Форкните репозиторий.
2. Создайте ветку для фичи (`git checkout -b feat/my-new-feature`).
3. Закоммитьте изменения по стандарту [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m 'feat(widgets): add new crypto widget'`).
4. Убедитесь, что все тесты и линтер проходят: `npm test && npm run lint`.
5. Отправьте ветку (`git push origin feat/my-new-feature`).
6. Откройте **Pull Request**.

---

## 📄 Лицензия

Проект распространяется под свободной лицензией **GNU General Public License v3.0 (GPL-3.0)**. Подробнее см. в файле [LICENSE](LICENSE).

<div align="center">
  <sub>Сделано с ❤️ для удобной и продуктивной работы в браузере.</sub>
</div>
