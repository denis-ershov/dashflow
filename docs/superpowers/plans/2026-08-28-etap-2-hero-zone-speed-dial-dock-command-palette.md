# План реализации: Этап 2 — Central Hero Zone, Speed Dial, Floating Dock & Command Palette

## Цель этапа

Реализовать центральную атмосферную Hero-зону, Speed Dial с авто-фавиконками, плавающий нижний Dock управления и универсальную командную строку (`Ctrl+K`), превращающие новую вкладку в персональную операционную систему в соответствии с ТЗ §1.5, §2.1, §2.6, §2.7 и визуальным уровнем Reflect / Casca / Tabrr.

---

## Задачи этапа

### 1. Central Hero Zone (`src/features/hero/`)
- [ ] **`HeroClock.tsx`**:
  - 5 стилизованных режимов шрифта: `digital`, `minimal`, `serif`, `flip`, `mono`.
  - Поддержка 12/24-часового формата, переключения секунд и локализованной даты на русском.
- [ ] **`SmartGreeting.tsx`**:
  - Динамическое приветствие («Доброе утро», «Добрый день», «Добрый вечер», «Доброй ночи») с именем пользователя и эмодзи-акцентом.
- [ ] **`SearchBar2.tsx`**:
  - Стеклянная строка мультипоиска с поддержкой 7 поисковиков: Google, Yandex, DuckDuckGo, Bing, GitHub, YouTube, Perplexity/AI.
  - Переключение поисковой системы кликом по иконке или выпадающим меню.
  - Горячие клавиши активации (`/` и `Ctrl+K`).
- [ ] **`YearProgression.tsx`**:
  - Визуализация прогресса дня, месяца и года с процентами и мягким индикатором заполнения.
- [ ] **`HeroSection.tsx`**:
  - Главный контейнер Hero-зоны с плавной адаптивностью и анимациями появления.

### 2. Speed Dial & Быстрые ссылки (`src/features/speedDial/`)
- [ ] **`SpeedDialGrid.tsx`**:
  - Стеклянные капсулы сайтов с авто-фавиконками (`google.com/s2/favicons?domain=...&sz=64`), hover glow эффектом и контекстным меню удаления/редактирования.
- [ ] **`AddLinkModal.tsx`**:
  - Модальное окно быстрого добавления пользовательской ссылки.

### 3. Floating Dock (`src/features/dock/`)
- [ ] **`FloatingDock.tsx`**:
  - Плавающий нижний стеклянный бар (`glass-pill`) с быстрыми действиями:
    - Переключение режимов **Zen (Фокус)** / **Dashboard (Виджеты)**;
    - Каталог виджетов (`AddWidgetModal`);
    - Темы и обои (`AppearanceModal`);
    - Фоновые звуки природы (`AmbientAudioDrawer`);
    - Командная строка (`CommandPalette`);
    - Настройки (`SettingsDrawer`).
  - Поддержка горячих клавиш и Mobile First оптимизация.

### 4. Command Palette (`Ctrl+K`) (`src/features/dashboard/CommandPalette.tsx`)
- [ ] Поиск по виджетам (быстрое добавление на сетку).
- [ ] Быстрое переключение 9 тем оформления.
- [ ] Поиск по закладкам Chrome.
- [ ] Быстрое создание задач и заметок.

### 5. Состояние и персистентность
- [ ] Добавить в `useDashboardStore` параметры:
  - `layoutMode: 'zen' | 'modular'`;
  - `heroSettings`: `{ clockStyle, showSeconds, showDate, showGreeting, userName, showYearProgress, defaultSearchEngine }`;
  - `speedDialLinks`: массив пользовательских ссылок.
- [ ] Поддержка сохранения в `chrome.storage.local` / `StorageAdapter`.

### 6. Тестирование и проверка качества
- [ ] Написать unit и component тесты для `HeroClock`, `SmartGreeting`, `SearchBar2`, `YearProgression`, `SpeedDialGrid`, `FloatingDock`, `CommandPalette`.
- [ ] Проверить `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] Обновить `docs/CHANGELOG.md` и архитектурную документацию.

---

## Критерии приёмки
1. Часы безупречно отображаются во всех 5 стилях с правильной локализацией на русском языке.
2. Поиск работает с мгновенным переключением между 7 поисковыми системами.
3. Speed Dial отображает фавиконки, позволяет добавлять, редактировать и открывать ссылки.
4. Плавающий Dock переключает режимы Zen и Dashboard без артефактов и задержек.
5. Command Palette открывается по `Ctrl+K` или `/` и выполняет быстрые действия.
6. 100% прохождение всех тестов и линтера.
