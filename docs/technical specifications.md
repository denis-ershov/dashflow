# Техническое задание

# Chrome Personal Start Page

## Общая концепция проекта

Разработать современное расширение для Google Chrome, которое полностью заменяет стандартную страницу новой вкладки персональным рабочим пространством пользователя.

Основная концепция продукта:

> **Персональный Dashboard в новой вкладке Chrome, состоящий из независимых виджетов, которые пользователь может добавлять, удалять, перемещать, изменять по размеру и настраивать под себя.**

Расширение должно восприниматься не как набор отдельных функций, а как **операционная система новой вкладки**.

Ключевые характеристики:

* современный premium UI;
* модульная архитектура;
* независимые виджеты;
* drag & drop;
* изменение размеров;
* система тем;
* глубокая кастомизация;
* локальное хранение данных;
* возможность дальнейшего облачного синхронизирования;
* SDK для сторонних разработчиков;
* магазин виджетов;
* высокая производительность;
* адаптивность;
* анимации и плавные переходы.

Исходная концепция проекта предполагает замену стандартной Chrome Start Page персональным Dashboard с виджетами, закладками, задачами и другой часто используемой информацией.

---

# 1. СКЕЛЕТ ПРОЕКТА

## 1.1. Цель этапа

На первом этапе необходимо создать фундамент продукта:

* архитектуру расширения;
* систему страниц;
* систему виджетов;
* layout engine;
* систему состояния;
* систему хранения;
* базовую систему настроек;
* систему локализации;
* API взаимодействия между ядром и виджетами.

На этом этапе **не требуется реализовывать весь функционал виджетов**.

Главная задача — получить устойчивый фундамент, на который впоследствии можно устанавливать любые виджеты и плагины.

---

## 1.2. Технологический стек

### Extension Framework

* WXT Next-gen Web Extension Framework
* Manifest V3

### Frontend

* React 19
* TypeScript
* Vite 8
* TailwindCSS 4

### UI

* Sofia Sans
* собственная UI component system;
* CSS Variables;
* дизайн-токены;
* анимации на CSS/Web Animations API;
* Lucide или аналогичная icon system.

### State Management

Для глобального состояния:

* Zustand.

Для серверных/API данных:

* TanStack Query.

Для immutable updates:

* Immer.

Исходное ТЗ также предусматривает Context API, Zustand, TanStack Query и Immer.

---

## 1.3. Архитектура проекта

Рекомендуемая структура:

```text
src/
├── background/
│   ├── index.ts
│   ├── api/
│   ├── storage/
│   └── services/
│
├── content/
│
├── popup/
│
├── pages/
│   └── newtab/
│       ├── components/
│       │   ├── ui/
│       │   ├── layout/
│       │   ├── widgets/
│       │   └── overlays/
│       │
│       ├── features/
│       │   ├── dashboard/
│       │   ├── widgets/
│       │   ├── settings/
│       │   ├── themes/
│       │   └── marketplace/
│       │
│       ├── hooks/
│       ├── stores/
│       ├── providers/
│       └── index.tsx
│
├── widgets/
│   ├── core/
│   ├── built-in/
│   └── registry/
│
├── sdk/
│
├── services/
│   ├── storage/
│   ├── api/
│   ├── permissions/
│   └── localization/
│
├── types/
│
├── utils/
│
├── assets/
│
└── styles/
    ├── globals.css
    ├── tokens.css
    └── themes.css
```

---

## 1.4. Основные слои архитектуры

Система должна быть разделена на независимые уровни.

### Core

Отвечает за:

* запуск приложения;
* регистрацию виджетов;
* управление layout;
* управление состоянием;
* storage;
* permissions;
* события;
* темы;
* настройки.

### Widget System

Каждый виджет должен быть изолированным модулем.

Виджет не должен напрямую зависеть от внутренней реализации другого виджета.

### UI System

Общие компоненты:

* Button;
* Input;
* Select;
* Modal;
* Dropdown;
* Tooltip;
* Card;
* Tabs;
* Switch;
* Slider;
* Context Menu;
* Command Palette;
* Toast;
* Dialog.

### Storage

Единый API:

```ts
storage.get()
storage.set()
storage.update()
storage.remove()
storage.clear()
```

На первом этапе:

* Chrome Storage API;
* IndexedDB для больших данных;
* кеширование API-ответов.

Исходное ТЗ предусматривает именно такое разделение хранения.

---

## 1.5. Dashboard

Основной экран приложения представляет собой бесконечно настраиваемый Dashboard.

Базовая модель:

```text
Dashboard
 ├── Header
 ├── Widget Grid
 │    ├── Widget
 │    ├── Widget
 │    ├── Widget
 │    └── Widget
 └── Floating Toolbar
```

Dashboard должен поддерживать:

* добавление виджетов;
* удаление;
* перемещение;
* изменение размера;
* скрытие;
* закрепление;
* настройку;
* fullscreen;
* drag & drop.

---

## 1.6. Grid System

Предусмотреть grid engine.

Поддержать:

* 12 колонок;
* 16 колонок;
* 24 колонки;
* автоматическое выравнивание;
* предотвращение пересечений;
* snap-to-grid;
* responsive layout.

Исходное ТЗ предусматривает 12/16/24-колоночные сетки и preset layouts.

---

## 1.7. Widget Model

Каждый виджет должен иметь метаданные:

```ts
interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  version: string;

  icon: string;

  component: React.ComponentType;

  defaultSize: {
    width: number;
    height: number;
  };

  minSize?: {
    width: number;
    height: number;
  };

  maxSize?: {
    width: number;
    height: number;
  };

  permissions?: Permission[];

  settings?: WidgetSetting[];

  category: WidgetCategory;
}
```

---

## 1.8. Локализация

Минимально:

* русский;
* английский.

Должна поддерживаться:

* автоматическая загрузка языка браузера;
* ручной выбор языка;
* сохранение выбора пользователя.

Это соответствует acceptance criteria исходного ТЗ.

---

# 2. ДИЗАЙН

## 2.1. Цель

Дизайн — одна из ключевых частей продукта.

Расширение должно визуально восприниматься как современный premium-продукт уровня лучших productivity/dashboard приложений.

Необходимо избегать ощущения:

* старого браузерного расширения;
* набора Bootstrap-компонентов;
* обычной админ-панели;
* перегруженного dashboard.

Основной принцип:

> **Minimal, premium, functional.**

---

## 2.2. Визуальный стиль

Основные характеристики:

* минимализм;
* большие свободные пространства;
* аккуратные карточки;
* мягкие границы;
* subtle shadows;
* glass / translucent эффекты там, где они уместны;
* плавные анимации;
* micro-interactions;
* выразительная типографика;
* единая система spacing;
* визуальная иерархия.

---

## 2.3. Основной экран

Главная страница должна быть визуально чистой.

Примерная структура:

```text
┌─────────────────────────────────────────────┐
│ Logo / Greeting          Search      Clock │
├─────────────────────────────────────────────┤
│                                             │
│   ┌────────────┐ ┌────────────┐ ┌────────┐ │
│   │ Weather    │ │ Calendar   │ │ Tasks  │ │
│   │            │ │            │ │        │ │
│   └────────────┘ └────────────┘ └────────┘ │
│                                             │
│   ┌──────────────────┐ ┌──────────────────┐ │
│   │                  │ │                  │ │
│   │      Notes       │ │     Bookmarks    │ │
│   │                  │ │                  │ │
│   └──────────────────┘ └──────────────────┘ │
│                                             │
│                         [+ Add widget]      │
└─────────────────────────────────────────────┘
```

При этом расположение элементов полностью контролируется пользователем.

---

## 2.4. Widget Card

Каждый виджет должен иметь единую визуальную основу:

```text
┌─────────────────────────────┐
│ Icon  Widget name       ⋯  │
│                             │
│                             │
│        Widget content       │
│                             │
└─────────────────────────────┘
```

При hover:

* появляется subtle elevation;
* становятся доступны действия;
* появляется resize handle;
* возможно отображение drag indicator.

---

## 2.5. Анимации

Анимации являются обязательной частью дизайна.

Необходимы:

* плавное появление Dashboard;
* анимация добавления виджета;
* анимация удаления;
* плавный drag & drop;
* resize animation;
* hover effects;
* modal transitions;
* dropdown transitions;
* page transitions;
* skeleton loading;
* animated loading states.

Анимации должны быть быстрыми и ненавязчивыми.

Не использовать чрезмерные эффекты.

---

## 2.6. Floating Toolbar

Предусмотреть плавающую панель управления.

Основные действия:

* Add Widget;
* Search;
* Settings;
* Themes;
* Edit Layout;
* Lock Layout.

Панель может находиться:

* в нижней части;
* сбоку;
* либо автоматически скрываться.

---

## 2.7. Command Palette

Добавить Command Palette по аналогии с современными productivity-приложениями.

Открытие:

```text
Ctrl + K
```

Функции:

* открыть виджет;
* добавить виджет;
* открыть настройки;
* изменить тему;
* найти bookmark;
* создать task;
* открыть URL;
* выполнить системную команду.

---

## 2.8. Responsive Design

Интерфейс должен адаптироваться под:

* Full HD;
* 2K;
* 4K;
* ноутбуки;
* Retina;
* небольшие окна браузера.

Также необходимо предусмотреть мобильный режим на будущее.

Исходное ТЗ отдельно предусматривает responsive, mobile mode и поддержку high-density экранов.

---

# 3. МИНИМАЛЬНЫЙ MVP

## 3.1. Цель MVP

MVP должен позволить пользователю установить расширение и сразу получить полноценную персональную новую вкладку.

В MVP не нужно реализовывать весь список будущих интеграций.

Необходимо сделать **идеально работающую основу**.

---

## 3.2. Виджеты MVP

В первую версию включить:

### 1. Clock

Функции:

* цифровые часы;
* дата;
* день недели;
* 12/24 формат;
* настройка timezone.

### 2. Weather

Функции:

* текущая температура;
* город;
* состояние погоды;
* иконка;
* минимальный forecast.

### 3. Search

Поддержка:

* Google;
* Bing;
* DuckDuckGo;
* Yandex.

### 4. Bookmarks

Функции:

* Chrome Bookmarks API;
* папки;
* поиск;
* favicon;
* drag & drop.

### 5. To-Do

Функции:

* создание задачи;
* удаление;
* выполнение;
* редактирование;
* priority;
* deadline;
* категории.

### 6. Notes

Функции:

* создание заметок;
* редактирование;
* изменение размера;
* сохранение;
* базовое форматирование.

### 7. Quick Links

Быстрые ссылки на любимые сайты.

---

## 3.3. Widget Management

MVP обязательно должен поддерживать:

* Add Widget;
* Remove Widget;
* Move Widget;
* Resize Widget;
* Hide Widget;
* Widget Settings;
* Reset Widget;
* Lock Layout.

---

## 3.4. Layout

Пользователь должен иметь возможность:

```text
Drag → Drop → Resize → Save
```

Положение виджетов автоматически сохраняется.

После перезапуска Chrome Dashboard должен восстановиться в том же состоянии.

---

## 3.5. Storage

В MVP:

### Chrome Storage

Хранить:

* настройки;
* layout;
* список виджетов;
* темы;
* пользовательские preferences.

### IndexedDB

Использовать для:

* больших локальных данных;
* кеша;
* RSS в будущем;
* истории;
* потенциально offline data.

---

## 3.6. Настройки MVP

Раздел Settings:

### General

* язык;
* формат времени;
* начало недели;
* animations on/off.

### Appearance

* Light;
* Dark;
* System.

### Layout

* количество колонок;
* gap;
* размер карточек.

### Widgets

* управление установленными виджетами.

---

## 3.7. Performance

Целевой показатель:

> Загрузка новой вкладки — менее 2 секунд.

Необходимо использовать:

* lazy loading;
* code splitting;
* кеширование;
* минимизацию initial bundle;
* оптимизацию React rendering.

Исходное acceptance criterion также устанавливает целевой page load менее 2 секунд.

---

## 3.8. Безопасность

Обязательно:

* Manifest V3;
* CSP;
* безопасное хранение токенов;
* отсутствие API keys в frontend bundle;
* XSS protection;
* валидация пользовательского CSS;
* permission model.

Исходное ТЗ отдельно предусматривает CSP, безопасное хранение API keys/tokens и XSS-защиту.

---

# 4. SDK ПЛАГИНОВ И МАГАЗИН ВИДЖЕТОВ

Этот этап превращает Dashboard из одного расширения в **платформу**.

## 4.1. Основная идея

После MVP разработать публичный SDK, позволяющий сторонним разработчикам создавать собственные виджеты.

Пример:

```ts
createWidget({
  id: "crypto-price",
  name: "Crypto Price",
  version: "1.0.0",

  component: CryptoWidget,

  permissions: [
    "network"
  ],

  settings: [
    ...
  ]
});
```

---

## 4.2. Widget SDK

SDK должен предоставлять:

### UI API

* Card;
* Button;
* Input;
* Modal;
* Dropdown;
* Tabs;
* Tooltip.

### Storage API

```ts
storage.get()
storage.set()
storage.remove()
```

### Events API

```ts
events.on()
events.emit()
events.off()
```

### Settings API

Виджет должен иметь собственные настройки.

Например:

```text
Crypto Widget

Currency:
[ USD ▼ ]

Coins:
[ BTC ]
[ ETH ]

Refresh:
[ 5 min ▼ ]
```

---

## 4.3. Permissions

Каждый сторонний виджет должен явно указывать необходимые permissions.

Например:

```text
network
storage
notifications
location
calendar
bookmarks
```

Пользователь должен понимать, какие данные использует виджет.

---

## 4.4. Изоляция

Плагин не должен иметь прямого доступа ко всему приложению.

Необходимо использовать sandboxed/plugin architecture.

Виджет получает только разрешённые API.

---

## 4.5. Версионирование

Каждый plugin должен иметь:

```text
name
id
version
author
description
icon
permissions
dependencies
```

Использовать semantic versioning:

```text
1.0.0
1.1.0
2.0.0
```

---

## 4.6. Widget Marketplace

В расширении создать Marketplace.

Категории:

* Productivity;
* Finance;
* Developer;
* News;
* Social;
* Entertainment;
* Learning;
* Health;
* Utilities.

В marketplace отображать:

* название;
* preview;
* описание;
* разработчика;
* рейтинг;
* количество установок;
* permissions;
* версию;
* changelog.

---

## 4.7. Установка

Установка должна выполняться в один клик:

```text
[Install]
```

После установки:

```text
[Add to Dashboard]
```

Пользователь может:

* установить;
* добавить;
* удалить;
* обновить;
* оставить отзыв.

---

## 4.8. Developer Portal

В будущем предусмотреть отдельный портал разработчика.

Функции:

* регистрация;
* создание widget;
* загрузка package;
* версии;
* статистика установок;
* crash reports;
* отзывы;
* публикация обновлений.

---

# 5. ТЕМЫ И КАСТОМИЗАЦИЯ

## 5.1. Основная идея

Пользователь должен иметь возможность полностью изменить внешний вид Dashboard без изменения кода.

Система дизайна должна быть построена на **design tokens + CSS variables**.

---

## 5.2. Базовые темы

### Dark

Основная палитра:

```text
Background:       #12232E
Primary Accent:   #007CC7
Secondary Accent: #4DA8DA
Dark Surface:     #203647
Light Surface:    #EEFBFB
```

### Light

```text
Background:       #F5FAFD
Text:             #1A3A4A
Primary Accent:   #007CC7
Secondary Accent: #4DA8DA
Border:           #9BBECF
```

Эти цветовые значения взяты из исходного ТЗ проекта.

---

## 5.3. Theme Engine

Архитектура:

```text
Theme
 ├── colors
 ├── typography
 ├── spacing
 ├── radius
 ├── shadows
 ├── borders
 ├── animations
 └── widgets
```

Пример:

```ts
interface Theme {
  id: string;
  name: string;

  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    muted: string;
    border: string;
  };

  radius: {
    sm: string;
    md: string;
    lg: string;
  };

  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}
```

---

## 5.4. Готовые темы

Создать несколько preset themes:

* Default Dark;
* Default Light;
* Midnight;
* Ocean;
* Minimal;
* Glass;
* Aurora;
* High Contrast.

Количество тем может расширяться через Marketplace.

---

## 5.5. Custom Theme Builder

Пользователь должен иметь возможность создать собственную тему.

Настройки:

### Colors

* Background;
* Surface;
* Primary;
* Secondary;
* Text;
* Muted;
* Border.

### Layout

* Widget gap;
* Border radius;
* Card opacity;
* Shadow intensity.

### Typography

* Font family;
* Font size;
* Font weight.

---

## 5.6. Background

Поддержать:

* однотонный background;
* gradient;
* изображение;
* Unsplash;
* pattern;
* slideshow.

В исходном ТЗ также предусмотрены пользовательские изображения, Unsplash, gradients, patterns, slideshow и опциональные video backgrounds.

---

## 5.7. Custom CSS

На продвинутом этапе предоставить CSS Editor.

Возможности:

* syntax highlighting;
* autocomplete;
* live preview;
* reset;
* импорт;
* экспорт.

При этом пользовательский CSS должен проходить валидацию и не иметь возможности нарушить безопасность расширения.

---

## 5.8. Импорт и экспорт

Пользователь должен иметь возможность экспортировать весь Dashboard:

```json
{
  "version": "1.0",
  "theme": {},
  "layout": {},
  "widgets": [],
  "settings": {}
}
```

Поддержать:

* полный экспорт;
* экспорт темы;
* экспорт layout;
* экспорт отдельных виджетов;
* импорт конфигурации.

Исходное ТЗ также предусматривает JSON-конфигурацию, selective widget export и compatibility-checked import.

---

# Итоговая архитектура продукта

В результате продукт должен быть построен следующим образом:

```text
                    Chrome Extension
                           │
                           ▼
                    ┌─────────────┐
                    │     CORE    │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      Layout Engine    Widget Engine    Theme Engine
          │                │                │
          │                ▼                │
          │          ┌─────────────┐        │
          │          │   Widgets   │        │
          │          └──────┬──────┘        │
          │                 │               │
          │       ┌─────────┴─────────┐     │
          │       ▼                   ▼     │
          │   Built-in             Plugins  │
          │                         SDK      │
          │                           │      │
          │                           ▼      │
          │                      Marketplace│
          │                                  │
          └──────────────┬───────────────────┘
                         ▼
                  Storage / Sync
                         │
                ┌────────┴────────┐
                ▼                 ▼
          Chrome Storage       IndexedDB
                │
                ▼
          Cloud Sync (future)
```

# Приоритет разработки

## Этап 1 — Скелет

Сначала реализовать:

1. WXT;
2. React;
3. TypeScript;
4. Manifest V3;
5. New Tab Page;
6. Core architecture;
7. Widget Engine;
8. Layout Engine;
9. Storage;
10. State Management;
11. базовую UI-систему.

## Этап 2 — Дизайн

После появления архитектурного скелета:

1. дизайн-система;
2. typography;
3. colors;
4. widget cards;
5. Dashboard;
6. animations;
7. responsive;
8. settings;
9. command palette;
10. dark/light themes.

## Этап 3 — MVP

Затем:

1. Clock;
2. Search;
3. Weather;
4. Bookmarks;
5. To-Do;
6. Notes;
7. Quick Links;
8. drag & drop;
9. resize;
10. сохранение layout;
11. настройки.

## Этап 4 — SDK + Marketplace

После стабилизации Core:

1. Widget SDK;
2. Plugin API;
3. permissions;
4. sandbox;
5. widget package format;
6. marketplace;
7. installation/update system;
8. developer portal.

## Этап 5 — Themes

После стабилизации UI:

1. Theme Engine;
2. design tokens;
3. preset themes;
4. custom themes;
5. background system;
6. theme marketplace;
7. CSS editor;
8. import/export.

# Главный принцип разработки

**Core должен быть отделён от конкретных виджетов.**

Нельзя строить архитектуру по принципу:

```text
Dashboard
 ├── Weather
 ├── Calendar
 ├── Todo
 ├── Notes
 └── Bookmarks
```

Правильная архитектура:

```text
Dashboard
      │
      ▼
Widget Engine
      │
      ├── Weather
      ├── Calendar
      ├── Todo
      ├── Notes
      ├── Bookmarks
      │
      └── Third-party plugins
```

Это позволит сначала сделать сильный MVP, а затем превратить расширение в **платформу с экосистемой виджетов**, не переписывая Core.

Главная цель первого этапа — не количество функций, а создание качественного **Core + Design System + Widget Engine**, которые станут фундаментом всего продукта.
