<div align="center">

# ⚡ DashFlow

**Ультра-премиальный, адаптивный и расширяемый дашборд новой вкладки для браузера**  
*Создан на базе React 19, TypeScript, Tailwind CSS 4 и WXT (Chrome Manifest V3)*

[![Version](https://img.shields.io/badge/version-2.4.0-blue.svg?style=flat-square)](docs/CHANGELOG.md)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-green.svg?style=flat-square)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-orange.svg?style=flat-square)](wxt.config.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react&logoColor=black)](package.json)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](src/styles/globals.css)
[![Tests](https://img.shields.io/badge/Tests-562_Passed-success.svg?style=flat-square)](tests/)

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

- **🧘 Dual Mode (Zen & Modular):** мгновенное переключение между минималистичным режимом глубокой концентрации (**Zen Mode**) и полнофункциональной модульной сеткой (**Modular Dashboard**).
- **🔊 Ambient Audio Engine (Web Audio API):** процедурный синтез 6 звуков природы (*Дождь за окном*, *Костёр*, *Океанские волны*, *Лес и ветер*, *Кафе*, *Белый шум*) и гармонический колокол Помодоро без внешних медиафайлов.
- **🖼️ Wallpaper Engine 2.0:** встроенная галерея из 8 кинематографичных HD-обоев, регулировка затемнения (`scrim`) 0–90% и поддержка пользовательских фонов.
- **⚡ Central Hero Zone:**
  - **Эстетичные часы:** 5 дизайнерских стилей отображения (`digital`, `minimal`, `serif`, `flip`, `mono`), формат 12/24ч, секунды и дата на русском языке.
  - **Smart Greeting:** контекстное приветствие по времени суток (*«Доброе утро»*, *«Добрый день»*, *«Добрый вечер»*, *«Доброй ночи»*).
  - **Spotlight SearchBar 2.0:** мультипоисковая строка со сменяемыми движками (Google, Yandex, DuckDuckGo, Bing, GitHub, YouTube, Perplexity AI) и шорткатом `/`.
  - **Year Progression:** интерактивный прогресс-бар дня, месяца и года с процентной шкалой.
- **🚀 Speed Dial:** стеклянные нео-капсулы избранных сайтов с авто-фавиконками и плавными hover-анимациями.
- **🎛️ Floating Dock:** парящая панель быстрого управления, переключения режимов, вызова звуков природы, тем и каталога виджетов.
- **⌨️ Command Palette (`Ctrl+K`):** универсальная командная палитра с клавиатурным управлением по 12 виджетам, 9 темам, режимам и поиску.
- **🎨 Glassmorphism Design System 2.0:** многослойное стекло `.glass-panel`, `.glass-card`, `.glass-pill` с `backdrop-filter: blur(24px)`, современные шрифты (*Sofia Sans*, *Inter*, *Nunito*, *Roboto Slab*, *JetBrains Mono*, *Outfit*) и строгий контраст WCAG 2.1 AAA.
- **🛡️ Безопасность Manifest V3:** декларативные JSON-плагины, изолированная песочница `iframe` (`sandbox="allow-scripts"` без `allow-same-origin`), строгий контроль разрешений (`PermissionManager`).
- **📐 Бесколлизионная сетка (React-Grid-Layout v2):** Drag & Drop, изменение размеров, автоматическое вертикальное вытеснение и алгоритм поиска свободного слота.
- **⚡ Молниеносная скорость:** локальное хранилище через `StorageAdapter`, компактный размер расширения (~640 КБ) и 0 сетевых утечек.

---

## 📦 Встроенные виджеты

В DashFlow включены 12 оптимизированных встроенных виджетов:

| Виджет | ID | Категория | Описание |
| :--- | :--- | :--- | :--- |
| **Часы** | `clock` | `utilities` | Цифровые часы с датой, 12/24ч форматом, секундами и Intl-форматированием |
| **Погода 2.0** | `weather` | `utilities` | Почасовой прогноз на 6 часов, влажность, скорость ветра, ощущаемая температура |
| **Поиск** | `search` | `utilities` | Мультипоисковая строка (Google, Yandex, DuckDuckGo, Bing, GitHub, YouTube) |
| **Задачи 2.0** | `todo` | `productivity` | Менеджер задач со счетчиком прогресса дня, приоритетами и очисткой выполненных |
| **Заметки Pro** | `notes` | `productivity` | Двухрежимный блокнот с Markdown-предпросмотром списков и чекбоксов, счетчик слов |
| **Быстрые ссылки** | `quickLinks` | `productivity` | Визуальные плитки избранных сайтов со стеклянным оформлением и авто-фавиконками |
| **Закладки** | `bookmarks` | `utilities` | Быстрый доступ к закладкам браузера Chrome с навигацией по папкам |
| **Веб-фрейм** | `iframe` | `entertainment` | Встраивание внешних веб-страниц в безопасной песочнице |
| **Помодоро** | `pomodoro` | `productivity` | Таймер фокуса со звуковым гармоническим колоколом через Web Audio API |
| **Цитаты** | `quotes` | `entertainment` | Вдохновляющие высказывания мыслителей с копированием в буфер обмена в 1 клик |
| **Системный монитор** | `systemMonitor` | `developer` | Мониторинг сети, батареи (Battery API), счетчика вкладок Chrome и памяти JS Heap |
| **RSS Ридер** | `rssReader` | `news` | Лента новостей с режимами отображения (миниатюры, компактный, карточки) |

---

## 🚀 Быстрый старт

### Установка в браузер (для пользователей)

1. Скачайте архив или соберите проект командой `npm run build`.
2. Откройте в Chrome страницу расширений: `chrome://extensions/`.
3. Включите **«Режим разработчика»** (Developer mode) в правом верхнем углу.
4. Нажмите **«Загрузить распакованное расширение»** (Load unpacked) и выберите папку `.output/chrome-mv3`.
5. Откройте новую вкладку! 🎉

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
npx tsc --noEmit

# Проверка линтером (ESLint 9)
npm run lint

# Запуск тестов (Vitest, 562 теста)
npm test

# Сборка production bundle (WXT / Chrome MV3)
npm run build
```

---

## ⌨️ Горячие клавиши

| Сочетание | Действие |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Открыть палитру команд (Command Palette) |
| `/` | Сфокусировать строку поиска |
| `Alt + E` | Переключить режим редактирования сетки виджетов |
| `Alt + A` | Открыть модальное окно добавления виджетов |
| `Alt + S` | Открыть настройки дашборда |
| `Esc` | Закрыть активное модальное окно / шторку / палитру |

---

## 📚 Документация

Подробная архитектурная документация проекта доступна в каталоге [`docs/`](docs/):

- [`docs/CORE_ARCHITECTURE.md`](docs/CORE_ARCHITECTURE.md) — ядро системы, жизненный цикл и хранилище.
- [`docs/LAYOUT_AND_NAVIGATION_ARCHITECTURE.md`](docs/LAYOUT_AND_NAVIGATION_ARCHITECTURE.md) — архитектура Dual Mode, Hero Section и Floating Dock.
- [`docs/AUDIO_ARCHITECTURE.md`](docs/AUDIO_ARCHITECTURE.md) — процедурный звуковой движок на Web Audio API.
- [`docs/THEME_ENGINE_ARCHITECTURE.md`](docs/THEME_ENGINE_ARCHITECTURE.md) — цветовая математика, Glassmorphism токены и WCAG AAA.
- [`docs/WIDGET_CATALOG_ARCHITECTURE.md`](docs/WIDGET_CATALOG_ARCHITECTURE.md) — архитектура 12 встроенных виджетов.
- [`docs/SECURITY_ARCHITECTURE.md`](docs/SECURITY_ARCHITECTURE.md) — модель безопасности Manifest V3 и песочница iframe.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — история всех версий и изменений.

---

<div align="center">
  <sub>DashFlow • Лицензия GPL-3.0</sub>
</div>
