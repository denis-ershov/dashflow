# Спецификация DashFlow 3.0: Ultra-Premium Redesign & Full Transformation

- **Дата:** 2026-08-28
- **Статус:** Утверждено к реализации
- **Класс изменения:** Архитектурно-визуальное обновление (UI/UX, Theme Engine, Layout Engine, Widgets 2.0, Ambient Audio, Speed Dial, Wallpaper Engine) при 100% сохранении системы внешних плагинов и модели безопасности Manifest V3.
- **Основание:** Исходное ТЗ `docs/technical specifications.md`, правила проекта `@[user_global]` (Правила 1–114), бенчмаркинг 4 флагманских расширений (Reflect New Tab, Casca, Tabrr Dashboard, SuperStart), стандарты `/modern-web-guidance` и инженерия `/senior-fullstack`.

---

## 1. Концепция и цель продукта

Создать персональную стартовую страницу (Dashboard) новой вкладки для Google Chrome уровня флагманских продуктов (Reflect, Linear, Apple, Raycast), сочетающую эстетику нео-стекла (Glassmorphism), глубокую функциональность виджетов, атмосферные звуковые ландшафты, мультипоиск, трекер привычек и модульную расширяемость через безопасные плагины.

### Ключевые требования:
1. **Эстетика и атмосфера:**
   - Нео-стекло (`backdrop-filter: blur(16px-24px) saturate(180%)`), многослойные тени, границы `1px rgba(255,255,255,0.12)`.
   - Шрифты: **Sofia Sans** (по ТЗ), **Inter**, **Nunito**, **Roboto Slab**, **JetBrains Mono**, **Outfit**.
   - Движок HD-обоев (галерея, градиенты, загрузка) с интерактивным размытием (`blur`) и затемнением (`scrim`).
   - Фоновые звуки природы (дождь, костёр, волны, лес, кафе, белый шум) на Web Audio API.
2. **Центральная Hero-зона (вместо жесткой табличной сетки):**
   - Часы с 5 стилями (Digital, Minimal, Typographic Serif, Retro Flip, Clean Mono).
   - Динамическое приветствие с именем пользователя.
   - Поисковая строка 2.0 со сменяемыми поисковиками (Google, Yandex, DuckDuckGo, Bing, GitHub, YouTube, Perplexity/AI).
   - Шкала прогресса года/дня (`Year Progression`).
   - Быстрые ссылки (Speed Dial) в виде стеклянных капсул с авто-фавиконками.
3. **Режимы отображения (Layout Modes):**
   - **Zen / Focus Mode:** минималистичный экран с часами, поиском, фоновыми звуками и обоями.
   - **Modular Dashboard:** органичная компоновка стеклянных карточек виджетов.
4. **Виджеты нового поколения (Rich Widgets 2.0):**
   - Погода с почасовым слайдером на 24 часа, УФ-индексом, влажностью и ветром.
   - Задачи & Трекер привычек (со стриками дней недели).
   - Заметки с поддержкой Markdown и несколькими вкладками.
   - Помодоро с круговым SVG-таймером и аудио-сигналами.
   - Закладки & Недавно закрытые вкладки (`chrome.sessions`).
   - Календарь с мини-месяцем и расписанием.
   - Мировое время, Цитаты, Системный монитор, RSS 2.0, Iframe.
5. **Сохранение ядра плагинов и безопасности:**
   - Декларативные JSON-плагины и HTML/JS плагины в изолированной песочнице `iframe` (`sandbox="allow-scripts"` без `allow-same-origin`).
   - Модальное окно подтверждения чувствительных разрешений (`PermissionConsentModal`).
   - Редактор Custom CSS с валидацией против сетевых утечек (`@import`, сторонние `url()`).
   - Импорт и экспорт настроек дашборда в JSON.

---

## 2. Архитектура слоёв и структура каталогов

```text
src/
├── entrypoints/
│   ├── background.ts                  # Фоновый Service Worker (alarms, sessions, context menu)
│   └── newtab/
│       ├── index.html                 # Точка входа новой вкладки
│       ├── main.tsx                   # Инициализация, синхронная регистрация реестра
│       └── App.tsx                    # Корневой макет (Wallpaper, Hero, Grid, Dock, Drawers)
│
├── core/
│   ├── theme/                         # Theme Engine: 3-слойные токены, sRGB математика, CSS-валидатор
│   ├── storage/                       # StorageAdapter, схема версионирования, миграции
│   ├── i18n/                          # Движок интернационализации (ru/en), useTranslation
│   ├── audio/                         # Web Audio API генератор фоновых звуков и звуков Помодоро
│   ├── widget/                        # Контракты WidgetDefinition, WidgetRegistry, WidgetShell
│   ├── plugins/                       # Декларативные плагины, SandboxBridge, RPC-мост
│   └── permissions/                   # Менеджер разрешений Chrome (PermissionManager)
│
├── ui/                                # Дизайн-система DashFlow (Atomic Design + Tailwind 4)
│   ├── primitives/                    # Button, Input, Select, Switch, Slider, Tooltip, Badge
│   ├── overlays/                      # Modal, Drawer, Dropdown, ContextMenu, useFocusTrap
│   └── feedback/                      # RootErrorBoundary, Spinner, Skeleton, EmptyState, Toast
│
├── features/
│   ├── hero/                          # HeroClock, SmartGreeting, SearchBar2, YearProgression
│   ├── speedDial/                     # SpeedDialGrid, FaviconLoader, AddLinkModal
│   ├── dashboard/                     # GridEngine, WidgetShell, WidgetSettingsDrawer, CommandPalette
│   ├── dock/                          # FloatingDock (Zen mode, Wallpaper, Add Widget, Audio, Settings)
│   ├── appearance/                    # AppearanceDrawer, WallpaperGallery, PresetGrid, CustomCssEditor
│   ├── audio/                         # AmbientSoundDrawer, SoundTogglePill
│   ├── marketplace/                   # MarketplaceModal, каталог плагинов, JSON-импорт
│   ├── navigation/                    # Каркас навигации (Dock + Mobile App Bar)
│   ├── permissions/                   # PermissionConsentModal
│   └── settings/                      # SettingsDrawer, экспорт/импорт конфигурации
│
├── widgets/built-in/                  # 12 встроенных богатых виджетов с ленивой загрузкой
│   ├── WeatherWidget/                 # Погода 2.0 (почасовой прогноз, UV, влажность, ветер)
│   ├── TodoAndHabitsWidget/           # Задачи + Трекер привычек со стриками
│   ├── NotesWidget/                   # Заметки 2.0 (Markdown, мульти-заметки)
│   ├── PomodoroWidget/                # Помодоро 2.0 (круговой SVG, аудио-сигналы)
│   ├── ClockWidget/                   # Часы и мировое время
│   ├── CalendarWidget/                # Календарь и мини-расписание
│   ├── BookmarksWidget/               # Закладки и недавно закрытые вкладки
│   ├── QuotesWidget/                  # Цитаты с типографикой и категориями
│   ├── QuickLinksWidget/              # Быстрые ссылки
│   ├── SystemMonitorWidget/           # Системный монитор (Battery, Network, Memory)
│   ├── RssWidget/                     # RSS Ридер 2.0
│   └── IframeWidget/                  # Безопасный фрейм
│
└── styles/
    ├── globals.css                    # Нео-стекло, шрифты, базовые правила
    ├── tokens.css                     # 3-слойные токены
    └── animations.css                 # Плавные микро-анимации (150-200ms)
```

---

## 3. Детализация ключевых модулей

### 3.1. Звуковой движок `AmbientAudioEngine` (`src/core/audio/`)
- Генерация фоновых звуковых текстур через Web Audio API (`AudioContext`, `BiquadFilterNode`, белые/розовые шумы для дождя/костра, синусоидальные осцилляторы для звона/колокола).
- Отсутствие внешних тяжёлых MP3-файлов — чистый процедурный Web Audio синтез без сетевых задержек.

### 3.2. Движок обоев `WallpaperEngine` (`src/features/appearance/`)
- Пресеты высококачественных фонов Unsplash.
- Градиентные анимированные CSS-меши.
- Пользовательские обои с сохранением в IndexedDB и превью.
- Динамический оверлей: `backdrop-filter: blur(var(--wallpaper-blur))` и `background: rgba(0, 0, 0, var(--wallpaper-scrim))`.

### 3.3. Мультипоиск `SearchBar2` (`src/features/hero/`)
- Поддержка поисковых систем: Google, Yandex, DuckDuckGo, Bing, GitHub, YouTube, Perplexity/AI.
- Горячие клавиши активации: `/` или `Ctrl+K`.
- Переключение движка кликом по иконке или стрелками клавиатуры.

### 3.4. Виджет «Задачи и Привычки» (`TodoAndHabitsWidget`)
- Раздел «Задачи»: фильтрация (Все / В работе / Выполнено), приоритеты (P1-P4), цветные проекты, дедлайны.
- Раздел «Привычки»: дни недели (Пн-Вс), отметка чекбоксами, вычисление текущего стрика (серии дней подряд) и прогресс-бар недели.

---

## 4. План реализации по этапам

1. **Этап 1:** Дизайн-система нового поколения (Glassmorphism & Typography), подключение шрифтов, CSS-токены, UI Primitives (`Button`, `Input`, `Select`, `Switch`, `Slider`, `Tooltip`, `Badge`, `Card`, `Toast`).
2. **Этап 2:** Hero-зона (эстетичные часы, приветствие, мультипоиск, прогресс года), Speed Dial, плавающий Dock и Command Palette (`Ctrl+K`).
3. **Этап 3:** Движок обоев (галерея, размытие, затемнение) и Web Audio генератор звуков природы.
4. **Этап 4:** Богатый рефакторинг всех виджетов (Погода 2.0 с почасовым прогнозом, Задачи + Привычки, Заметки MD, Помодоро с аудио, Календарь, Недавно закрытые вкладки).
5. **Этап 5:** Интеграция платформы плагинов, безопасности Manifest V3, песочницы `iframe`, каталога Marketplace и Custom CSS редактора.
6. **Этап 6:** SettingsDrawer, комплексное тестирование (Vitest, TypeScript, ESLint, WXT build), аудит через Chrome DevTools и обновление документации/CHANGELOG.
