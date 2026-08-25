# Этап 1. Дизайн-система и Theme Engine — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать единый визуальный язык DashFlow — трёхслойные токены, связанные с утилитами Tailwind 4, безопасный Theme Engine с девятью пресетами и валидацией пользовательского CSS, и переписанные на этих токенах `ui/primitives`, `ui/overlays`, `ui/feedback`; существующие экраны внешнего вида перерисованы на новый движок.

**Architecture:** Токены разделены на три слоя. Слой значений — `--dashflow-*` в `:root`, единственное, что меняет тема, и меняет одним тегом `<style id="dashflow-theme">`. Слой утилит — блок `@theme inline` в `tokens.css`, который превращает те же переменные в настоящие утилиты Tailwind (`bg-surface`, `text-fg`, `rounded-md`), сохраняя рантайм-изменяемость. Слой совместимости — старые имена `--color-bg`, `--color-text`, `--color-border` как псевдонимы новых, чтобы 26 файлов, которые переезжают в этапах 2–4, продолжали собираться. Логика темы живёт в `src/core/theme/` чистыми функциями без DOM (`buildThemeCss`, `validateCustomCss`, `migrateThemeState`), а DOM-часть изолирована в единственном модуле `applyTheme.ts`.

**Tech Stack:** WXT 0.19.27 (MV3), React 19, TypeScript 5.7.3 (`strict`), TailwindCSS 4.0.7 через `@tailwindcss/vite`, Zustand 5.0.3, Vitest 2.1.8 + jsdom + @testing-library/react, ESLint 9 (flat config) + Prettier 3.

**Spec:** [docs/superpowers/specs/2026-08-24-dashflow-restructure-redesign-design.md](../specs/2026-08-24-dashflow-restructure-redesign-design.md)

## Global Constraints

Значения ниже скопированы из спеки дословно. Требования каждой задачи неявно включают этот раздел.

- **Язык.** Весь код, комментарии, документация и сообщения коммитов — на русском (правило 1).
- **Шкала отступов:** 2, 4, 8, 12, 16, 24, 32, 48, 64 px. При множителе Tailwind `--spacing: 0.25rem` это шаги `0.5 1 2 3 4 6 8 12 16`. Прочие половинные шаги (`p-2.5` = 10 px, `p-3.5` = 14 px, `space-y-1.5` = 6 px) запрещены; `0.5` = 2 px разрешён как младший шаг шкалы.
- **Типографическая шкала:** 12, 13, 14, 16, 20, 24, 32, 48, 64 px с фиксированными межстрочными. Произвольные размеры (`text-[10px]`, `text-[11px]`, `text-[9px]`) запрещены.
- **Радиусы:** наследуются из текущих `xs`–`full` (6 / 10 / 14 / 20 / 28 / 9999 px), выбор задаётся пресетом темы.
- **z-index:** `base 0`, `raised 10`, `grid-item-active 20`, `rail 30`, `overlay 40`, `modal 50`, `toast 60`. Литералы `z-40`, `z-50`, `z-index: 100` запрещены.
- **Тайминги:** 150 / 200 / 250 ms, верхняя граница 250 ms (правило 19). Все анимации отключаются при `prefers-reduced-motion: reduce` (AC#7).
- **Палитра по умолчанию:** нейтральная тёмная — `#0b0f17` фон, `#3b82f6` primary, `#06b6d4` secondary, `#8b5cf6` accent. Синяя гамма ТЗ (`#12232E` / `#203647` / `#007CC7` / `#4DA8DA`) сохраняется как пресет **Deep Blue**.
- **Девять пресетов:** Neutral Dark (по умолчанию), Deep Blue, Default Light, Midnight Purple, Ocean Teal, Minimal Monochrome, Aurora Emerald, Glass, High Contrast.
- **Скрим обоев:** по умолчанию 30 %.
- **Схемы URL обоев:** только `https:`, `data:`, `chrome-extension:`.
- **Пользовательский CSS:** `@import` запрещён всегда; `url()` разрешён только со схемами `data:` и `chrome-extension:`; `behavior` и `-moz-binding` отсекаются; размер ограничен; внешние ресурсы — отдельным осознанным тумблером; сброс доступен всегда.
- **Ни одного цвета вне палитры в DOM** (AC#5). `bg-red-600`, `text-red-500`, `text-rose-400`, `text-emerald-400`, `bg-slate-900`, `border-slate-700`, `text-white` в коде UI запрещены.
- **Минимальная зона нажатия 44×44 px** для любого интерактивного элемента (правило 16).
- **High Contrast:** контраст текста к фону ≥ 4.5:1, проверяется тестом (AC#6).
- **Строгая типизация:** `any` запрещён, `unknown` — только с проверкой (правило 33).
- **Секреты и персональные данные** не попадают в код, логи и документацию (правило 32, 35).
- **Definition of Done этапа:** `tsc --noEmit` чист; `vitest run` зелёный с реально существующими тестами; `wxt build` проходит; проверено на 360 px и ≥ 2560 px; проход только с клавиатуры; состояния loading / empty / error / no-permission на месте; `docs/*_ARCHITECTURE.md` и `docs/CHANGELOG.md` обновлены; self-review по правилу 26. Плюс: существующая установка после этапа открывается и показывает дашборд.

## Проверенное состояние перед началом

Основание для приёмки — то, что сломано сейчас:

| Факт | Где | Следствие |
|---|---|---|
| Три источника темы: `useAppStore` пишет `data-theme`, `useThemeStore` пишет инлайновые стили в `documentElement`, `tokens.css` держит блок `[data-theme='light']` | `src/stores/useAppStore.ts:40,54`; `src/features/themes/stores/useThemeStore.ts:~150`; `src/styles/tokens.css:53` | инлайновые стили всегда сильнее селектора атрибута — светлая тема молча не работает |
| `--radius-*` переопределяются в `:root` после `@import 'tailwindcss'` | `src/styles/tokens.css:8-13` против `node_modules/tailwindcss/theme.css:397-404` | `rounded-md` = 14 px вместо 6 px по всему приложению; случайно, а не намеренно |
| Пользовательский CSS уходит в DOM без единой проверки | `useThemeStore.applyThemeToDom`, `CssEditorModal.tsx` | `@import` и `url()` на внешний хост раскрывают IP и время открытия вкладки |
| URL обоев подставляется в строку без проверки схемы | `useThemeStore`: `document.body.style.backgroundImage = \`url('${value}')\`` | инъекция в CSS и загрузка с произвольного хоста |
| Классы `animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-right` используются, но плагина `tailwindcss-animate` в проекте нет | `Modal.tsx`, `Drawer.tsx`, `Dropdown.tsx`, `Tooltip.tsx`, `CommandPalette.tsx` | все анимации оверлеев — no-op, правило 19 не выполняется вообще |
| Цвета вне палитры | `Button.tsx` `bg-red-600`; `Input.tsx` `border-red-500`, `text-red-500`; `Dropdown.tsx` `text-red-400`; `Tooltip.tsx` `bg-slate-900`, `border-slate-700`, `text-white` | AC#5 не выполняется, в светлой теме tooltip нечитаем |
| `Switch` — это `<div onClick>` внутри `<label>` | `src/components/ui/Switch.tsx` | нет `role="switch"`, `aria-checked`, клавиатуры; трек 44×24 |
| `Modal` и `Drawer` слушают `Escape` на `window`, но не имеют ни ловушки, ни возврата фокуса | `Modal.tsx:22-29`, `Drawer.tsx` | правило 16 и AC#26 не выполняются |
| `Button size="sm"` — `min-h-[36px]` | `src/components/ui/Button.tsx` | ниже порога 44 px |
| `@types/react-grid-layout` в `dependencies` | `package.json:17` | типы попадают в рантайм-зависимости |
| Тестов ровно два, оба в одном файле; `environment: 'node'` | `tests/unit/WidgetRegistry.test.ts`, `vitest.config.ts` | компонентные тесты физически невозможны |
| Шрифт Sofia Sans тянется с `fonts.googleapis.com` при каждом открытии вкладки | `src/entrypoints/newtab/index.html:7-10` | сетевой запрос и раскрытие IP на каждой новой вкладке, блокирующий первый рендер, поломка офлайн |

Фактически используемые из кода переменные — их имена обязаны сохраниться как псевдонимы: `--color-border` (80 употреблений), `--color-text` (77), `--color-text-muted` (72), `--color-primary` (64), `--color-surface` (45), `--color-bg` (20), `--color-surface-hover` (19), `--color-secondary` (19), `--transition-normal` (3), `--color-border-hover` (3), `--glass-bg` (2), `--color-primary-hover` (2), `--shadow-sm` (1), `--shadow-glow` (1), `--color-primary-glow` (1). Переменные `--radius-*` через `var()` не используются нигде — только через утилиты `rounded-*`, поэтому их перенос в `@theme inline` безопасен.

## File Structure

```
src/
  core/
    theme/
      color.ts              разбор цвета, альфа, относительная яркость, контраст — без DOM
      tokens.ts             контракт ThemeTokens, список ключей, шкалы радиусов, buildThemeCss
      presets.ts            девять пресетов как данные
      cssValidator.ts       чистая валидация пользовательского CSS + опциональный разбор парсером
      wallpaper.ts          проверка схемы URL обоев, безопасная сборка значения, скрим
      applyTheme.ts         единственный модуль этапа, который трогает DOM
      migrations.ts         версия состояния темы и чистая миграция v1 -> v2
      themeStore.ts         zustand-стор темы: состояние, действия, чтение и запись через инжектируемое хранилище
  ui/
    lib/cn.ts               объединение классов, разрешение конфликтов Tailwind
    primitives/             Button, Input, Switch, Slider, Tooltip, Badge, index.ts
    overlays/               Modal, Drawer, Dropdown, useFocusTrap, index.ts
    feedback/               Spinner, Skeleton, EmptyState, ErrorState, index.ts
  features/
    appearance/
      components/AppearanceModal.tsx    экран внешнего вида: пресеты, обои, скрим, стекло, радиус
      components/PresetGrid.tsx         сетка пресетов
      components/WallpaperPicker.tsx    обои и скрим
      components/CustomCssEditor.tsx    редактор CSS с показом результата валидации
  styles/
    tokens.css              три слоя токенов + мост в Tailwind + анимации
    globals.css             база, скроллбары, слой сетки, prefers-reduced-motion

tests/
  setup.ts                            матчеры и очистка DOM между тестами
  unit/theme/color.test.ts
  unit/theme/tokens.test.ts
  unit/theme/presets.test.ts
  unit/theme/cssValidator.test.ts
  unit/theme/wallpaper.test.ts
  unit/theme/applyTheme.test.ts
  unit/theme/migrations.test.ts
  unit/theme/themeStore.test.ts
  unit/styles/tokens.contract.test.ts  контракт CSS-файлов: без него коллизия namespace вернётся
  unit/styles/scale.guard.test.ts      сторож шкал в коде этапа, область расширяется этапами 2-6
  unit/ui/cn.test.ts
  component/primitives/*.test.tsx
  component/overlays/*.test.tsx
  component/feedback/*.test.tsx
  component/appearance/*.test.tsx

docs/
  THEME_ENGINE_ARCHITECTURE.md
  adr/ADR-004-single-source-of-truth.md
  adr/ADR-005-default-palette.md
  adr/ADR-007-external-resources-consent.md
```

Удаляется в конце этапа: `src/components/ui/` (восемь файлов переезжают в `src/ui/`), `src/features/themes/` (переезжает в `src/features/appearance/`).

**Отступление от структуры спеки, зафиксировано осознанно:** спека перечисляет в `ui/` подпапки `primitives`, `overlays`, `layout`, `feedback`. `ui/layout` в этом этапе не создаётся: его наполнение (`Rail`, `Section`, `Surface`) имеет смысл только вместе с оболочкой из этапа 3, а строить компоненты без потребителей — прямое нарушение YAGNI (правило 27). Добавляется не перечисленная в спеке `ui/lib/` под `cn()` — это утилита слоя UI, и в `core/` ей не место, потому что `core/` не должен знать про классы Tailwind.

---

### Задача 1: Тестовая оснастка и `cn()`

Компонентных тестов сейчас нельзя написать физически: `environment: 'node'`. Без этой задачи задачи 11–14 непроверяемы.

**Files:**
- Modify: `vitest.config.ts` (весь файл)
- Modify: `package.json:6-13` (scripts), `package.json:14-26` (перенос `@types/react-grid-layout` в devDependencies)
- Create: `tests/setup.ts`
- Create: `src/ui/lib/cn.ts`
- Test: `tests/unit/ui/cn.test.ts`, `tests/component/harness.test.tsx`

**Interfaces:**
- Consumes: ничего (первая задача этапа).
- Produces: `cn(...inputs: ClassValue[]): string` из `@/ui/lib/cn` — используется во всех задачах 11–14. Тестовое окружение `jsdom` с глобалами Vitest, автоочисткой RTL и удалением тегов `style[id^="dashflow-"]` из `document.head` после каждого теста — на эту очистку опирается задача 9.

- [ ] **Шаг 1: Установить dev-зависимости**

```bash
npm i -D jsdom@^25.0.1 @testing-library/react@^16.1.0 @testing-library/jest-dom@^6.6.3 @testing-library/user-event@^14.5.2
```

Обоснование по правилу 41: все четыре — только для разработки, в бандл не попадают. `jsdom` — единственный способ проверить DOM-часть Theme Engine и компоненты; `@testing-library/react` — стандарт для React 19 (версия 16 объявляет React 19 в peer); `jest-dom` даёт матчеры вида `toHaveAttribute`; `user-event` нужен для проверки ловушки фокуса и клавиатуры — вручную `Tab` не воспроизводится.

Если npm откажет по peer-зависимостям React 19, повторить с `@testing-library/react@^16.2.0`.

- [ ] **Шаг 2: Перенести `@types/react-grid-layout` в devDependencies**

В `package.json` удалить строку `"@types/react-grid-layout": "^1.3.6",` из блока `dependencies` и добавить её в `devDependencies` (по алфавиту — перед `@types/react`). Затем:

```bash
npm install
```

- [ ] **Шаг 3: Добавить скрипты**

В `package.json` в блок `scripts` добавить:

```json
    "test:watch": "vitest"
```

- [ ] **Шаг 4: Переписать `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // jsdom, а не node: без него нельзя проверить ни применение темы к DOM,
    // ни один компонент. Чистые функции в jsdom работают так же.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Шаг 5: Создать `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Очистка между тестами. Помимо размонтирования React-дерева убираются
 * теги темы и инлайновые стили корня: Theme Engine пишет в document.head,
 * и без этого состояние протекало бы из теста в тест.
 */
afterEach(() => {
  cleanup();
  document.head.querySelectorAll('style[id^="dashflow-"]').forEach((tag) => {
    tag.remove();
  });
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
});
```

- [ ] **Шаг 6: Написать падающие тесты**

`tests/unit/ui/cn.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cn } from '@/ui/lib/cn';

describe('cn', () => {
  it('объединяет классы и отбрасывает ложные значения', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });

  it('разрешает конфликт утилит Tailwind в пользу последней', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('не склеивает утилиты из разных групп', () => {
    expect(cn('p-2', 'mt-4')).toBe('p-2 mt-4');
  });

  it('на пустом входе возвращает пустую строку', () => {
    expect(cn()).toBe('');
  });
});
```

`tests/component/harness.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('тестовое окружение', () => {
  it('умеет монтировать React-дерево в DOM', () => {
    render(<button type="button">Готово</button>);
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument();
  });

  it('предоставляет document для модулей, работающих с head', () => {
    const tag = document.createElement('style');
    tag.id = 'dashflow-probe';
    document.head.appendChild(tag);
    expect(document.getElementById('dashflow-probe')).not.toBeNull();
  });
});
```

- [ ] **Шаг 7: Убедиться, что тесты падают**

Run: `npx vitest run tests/unit/ui/cn.test.ts tests/component/harness.test.tsx`
Expected: FAIL — `Failed to resolve import "@/ui/lib/cn"`. Тест `harness.test.tsx` при этом должен пройти: он проверяет только окружение.

- [ ] **Шаг 8: Реализовать `cn`**

`src/ui/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Объединяет классы и разрешает конфликты утилит Tailwind: побеждает последняя.
 * Заменяет повторяющийся во всех компонентах вызов twMerge(clsx(...)).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Шаг 9: Убедиться, что тесты проходят**

Run: `npx vitest run`
Expected: PASS — три файла (включая существующий `WidgetRegistry.test.ts`), восемь тестов.

- [ ] **Шаг 10: Проверить, что сборка и типы не сломались**

Run: `npx tsc --noEmit && npx wxt build`
Expected: обе команды без ошибок.

- [ ] **Шаг 11: Коммит**

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts tests/unit/ui/cn.test.ts tests/component/harness.test.tsx src/ui/lib/cn.ts
git commit -m "test: окружение jsdom, оснастка RTL и утилита cn

Компонентные тесты были невозможны из-за environment: 'node'.
@types/react-grid-layout перенесён в devDependencies.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Задача 2: Гейт линтера и форматирования

AC#29 требует зелёный `npm run lint`, а скрипта `lint` в проекте нет вообще. Гейт ставится до написания кода этапа, чтобы весь новый код рождался под правилами, а не приводился к ним потом.

**Files:**
- Create: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`
- Modify: `package.json` (devDependencies, scripts)

**Interfaces:**
- Consumes: ничего.
- Produces: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`. Список `ignores` в `eslint.config.js` — контракт между этапами: каждый следующий этап удаляет из него каталог, который перевёз, и к концу этапа 6 список обязан содержать только артефакты сборки.

- [ ] **Шаг 1: Установить зависимости**

```bash
npm i -D eslint@^9.20.0 @eslint/js@^9.20.0 typescript-eslint@^8.24.0 eslint-plugin-react-hooks@^5.1.0 eslint-plugin-jsx-a11y@^6.10.2 eslint-config-prettier@^10.0.1 prettier@^3.5.1
```

Обоснование по правилу 41: `typescript-eslint` — единственный способ ловить `any` и небезопасные приведения статически (правило 33); `jsx-a11y` — единственный автоматический контроль правила 16, ручные проверки на 15 экранах не масштабируются; `eslint-config-prettier` гасит конфликт стилевых правил; `react-hooks` ловит нарушения правил хуков, которых в проекте уже есть примеры (`useEffect` с `JSON.stringify` в списке зависимостей).

- [ ] **Шаг 2: Создать `eslint.config.js`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '.wxt/',
      '.output/',
      'node_modules/',
      // Каталоги, которые переезжают в этапах 2-6. Список сокращается в каждом
      // этапе и к концу этапа 6 обязан остаться без строк ниже этой.
      'src/components/',
      'src/entrypoints/',
      'src/features/dashboard/',
      'src/features/marketplace/',
      'src/features/themes/',
      'src/plugins/',
      'src/services/',
      'src/stores/',
      'src/widgets/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      // В тестах намеренно подаются некорректные значения, чтобы проверить отказ.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  prettier,
);
```

- [ ] **Шаг 3: Создать `.prettierrc.json` и `.prettierignore`**

`.prettierrc.json` — значения совпадают с текущим стилем кода, чтобы форматирование не создало шум в диффах:

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "all",
  "arrowParens": "always"
}
```

`.prettierignore`:

```
.wxt/
.output/
node_modules/
package-lock.json
```

- [ ] **Шаг 4: Добавить скрипты в `package.json`**

```json
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"{src,tests}/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"{src,tests}/**/*.{ts,tsx,css}\""
```

- [ ] **Шаг 5: Запустить линтер и убедиться, что он видит код этапа**

Run: `npm run lint`
Expected: PASS без ошибок. На этот момент под линтером находятся только `src/ui/lib/cn.ts` и `tests/`, оба чистые. Если появятся ошибки в `tests/` — исправить их, а не расширять `ignores`.

- [ ] **Шаг 6: Проверить форматирование**

Run: `npm run format:check`
Expected: PASS. Если Prettier сообщит о расхождениях в `src/ui/` или `tests/` — выполнить `npm run format` и посмотреть дифф глазами: он не должен затрагивать ничего, кроме отступов и кавычек.

- [ ] **Шаг 7: Коммит**

```bash
git add eslint.config.js .prettierrc.json .prettierignore package.json package-lock.json
git commit -m "chore: гейт ESLint 9 и Prettier для кода этапа 1

Скрипта lint в проекте не было, AC#29 его требует. Каталоги, которые
переезжают в этапах 2-6, временно в ignores; список сокращается в каждом
этапе и обязан опустеть к концу этапа 6.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Задача 3: Структурные токены и мост в Tailwind

Здесь снимается коллизия `--radius-*`, оживают анимации оверлеев, появляются шкалы z-index и типографики. Всё это фундамент для задач 5, 11–14: без него компоненты пришлось бы писать на магических значениях.

**Files:**
- Modify: `src/styles/tokens.css` (полная замена, 82 строки → три слоя + мост)
- Modify: `src/styles/globals.css` (полная замена, 109 строк)
- Modify: `src/entrypoints/newtab/index.html:7-10` (удаление удалённых Google Fonts)
- Test: `tests/unit/styles/tokens.contract.test.ts`, `tests/unit/styles/scale.guard.test.ts`

**Interfaces:**
- Consumes: `cn()` не нужен; задача чисто CSS.
- Produces:
  - Переменные слоя 2 `--dashflow-*` — их имена **обязан** печатать `buildThemeCss` (задача 5). Полный список: `canvas`, `surface`, `surface-hover`, `surface-active`, `primary`, `primary-hover`, `primary-fg`, `secondary`, `accent`, `fg`, `fg-muted`, `fg-dim`, `line`, `line-hover`, `danger`, `warning`, `success`, `info`, `primary-glow`, `line-glow`, `ambient-1`, `ambient-2`, `glass-bg`, `glass-border`, `glass-blur`, `glass-opacity`, `radius-xs|sm|md|lg|xl`, `font-sans`, `font-mono`, `font-scale`. Плюс не входящие в тему `--app-bg-image` и `--app-scrim`.
  - Утилиты Tailwind для задач 11–14: `bg-canvas`, `bg-surface`, `bg-surface-hover`, `bg-surface-active`, `bg-primary`, `bg-primary-hover`, `text-primary-fg`, `bg-secondary`, `bg-accent`, `text-fg`, `text-fg-muted`, `text-fg-dim`, `border-line`, `border-line-hover`, `bg-danger`/`text-danger`, `bg-warning`, `bg-success`, `bg-info`, `bg-glass`, `border-glass-line`; `rounded-xs|sm|md|lg|xl|full`; `text-xs|13|sm|base|xl|2xl|display-sm|display-md|display-lg`; `animate-fade-in|scale-in|slide-in-right|slide-in-up`; `ease-expo`.
  - Переменные z-index для `z-[var(--z-modal)]`: `--z-base|raised|grid-item-active|rail|overlay|modal|toast`.
  - Тайминги `--duration-fast|normal|slow` и составные `--transition-fast|normal|slow`.

- [ ] **Шаг 1: Написать контрактный тест на `tokens.css`**

Тест читает файл как текст: PostCSS в проекте не подключён, а для собственного файла регулярных выражений достаточно. Его задача — не дать коллизии и «магии» вернуться.

`tests/unit/styles/tokens.contract.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CSS = readFileSync(resolve(__dirname, '../../../src/styles/tokens.css'), 'utf8');

/** Возвращает тело первого блока, начинающегося с указанного селектора или директивы. */
function block(header: string): string {
  const start = CSS.indexOf(header);
  expect(start, `блок «${header}» не найден`).toBeGreaterThanOrEqual(0);
  const open = CSS.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1;
    if (CSS[i] === '}') {
      depth -= 1;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  throw new Error(`блок «${header}» не закрыт`);
}

function declaredValue(source: string, name: string): string | undefined {
  const match = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(source);
  return match?.[1].trim();
}

describe('tokens.css — контракт шкал', () => {
  it('шкала z-index задана целиком и в правильном порядке', () => {
    const expected = {
      '--z-base': '0',
      '--z-raised': '10',
      '--z-grid-item-active': '20',
      '--z-rail': '30',
      '--z-overlay': '40',
      '--z-modal': '50',
      '--z-toast': '60',
    };
    for (const [name, value] of Object.entries(expected)) {
      expect(declaredValue(CSS, name), name).toBe(value);
    }
  });

  it('тайминги не превышают 250 ms (правило 19)', () => {
    const durations = [...CSS.matchAll(/--duration-[a-z]+\s*:\s*(\d+)ms/g)].map((m) => Number(m[1]));
    expect(durations.length).toBe(3);
    for (const value of durations) {
      expect(value).toBeLessThanOrEqual(250);
    }
  });

  it('радиусы объявлены только через @theme inline и ссылаются на слой темы', () => {
    const theme = block('@theme inline');
    for (const step of ['xs', 'sm', 'md', 'lg', 'xl']) {
      expect(declaredValue(theme, `--radius-${step}`)).toBe(`var(--dashflow-radius-${step})`);
    }
    // Ключевая защита: --radius-* в обычном :root возвращает коллизию с
    // дефолтами Tailwind, из-за которой rounded-md молча становился 14px.
    const roots = [...CSS.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]).join('\n');
    expect(roots).not.toMatch(/--radius-(xs|sm|md|lg|xl|2xl|full)\s*:/);
  });

  it('внешние радиусы Tailwind вне шкалы удалены', () => {
    const theme = block('@theme inline');
    expect(declaredValue(theme, '--radius-3xl')).toBe('initial');
    expect(declaredValue(theme, '--radius-4xl')).toBe('initial');
  });

  it('типографическая шкала — 12/13/14/16/20/24/32/48/64 px с межстрочными', () => {
    const theme = block('@theme {');
    const expected: Record<string, [string, string]> = {
      '--text-xs': ['0.75rem', '1rem'],
      '--text-13': ['0.8125rem', '1.125rem'],
      '--text-sm': ['0.875rem', '1.25rem'],
      '--text-base': ['1rem', '1.5rem'],
      '--text-xl': ['1.25rem', '1.75rem'],
      '--text-2xl': ['1.5rem', '2rem'],
      '--text-display-sm': ['2rem', '2.5rem'],
      '--text-display-md': ['3rem', '3.25rem'],
      '--text-display-lg': ['4rem', '4.25rem'],
    };
    for (const [name, [size, lineHeight]] of Object.entries(expected)) {
      expect(declaredValue(theme, name), name).toBe(size);
      expect(declaredValue(theme, `${name}--line-height`), `${name} line-height`).toBe(lineHeight);
    }
    expect(declaredValue(theme, '--text-lg')).toBe('initial');
  });

  it('каждый цвет Tailwind ссылается на слой темы, а не на литерал', () => {
    const theme = block('@theme inline');
    const colors = [...theme.matchAll(/(--color-[a-z-]+)\s*:\s*([^;]+);/g)];
    expect(colors.length).toBeGreaterThanOrEqual(18);
    for (const [, name, value] of colors) {
      expect(value.trim(), name).toMatch(/^var\(--dashflow-[a-z0-9-]+\)$/);
    }
  });

  it('каждый псевдоним старого имени ссылается на существующую переменную темы', () => {
    const aliases = [...CSS.matchAll(/(--(?:color|glass|shadow|font-family)-[a-z-]+)\s*:\s*var\((--dashflow-[a-z0-9-]+)\)/g)];
    expect(aliases.length).toBeGreaterThanOrEqual(20);
    for (const [, alias, target] of aliases) {
      expect(declaredValue(CSS, target), `${alias} → ${target}`).toBeDefined();
    }
  });

  it('есть выключатель анимаций для prefers-reduced-motion (правило 19)', () => {
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('анимации оверлеев объявлены как настоящие токены и имеют @keyframes', () => {
    const theme = block('@theme inline');
    for (const name of ['fade-in', 'scale-in', 'slide-in-right', 'slide-in-up']) {
      expect(declaredValue(theme, `--animate-${name}`), name).toContain(name);
      expect(CSS, `@keyframes ${name}`).toMatch(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
    }
  });
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Run: `npx vitest run tests/unit/styles/tokens.contract.test.ts`
Expected: FAIL — блок `@theme inline` в файле не найден, шкалы z-index и типографики отсутствуют.

- [ ] **Шаг 3: Полностью переписать `src/styles/tokens.css`**

```css
/* ============================================================================
   DashFlow · токены дизайн-системы

   Три слоя, порядок важен:
     1. Структура  — шкалы, которые тема не меняет: z-index, тайминги, тени.
     2. Значения   — дефолты темы в `--dashflow-*`; их перезаписывает тег
                     <style id="dashflow-theme">, который печатает applyTheme.
     3. Псевдонимы — старые имена `--color-*`, `--glass-*`, `--shadow-*`,
                     `--font-family-*`, на которые ссылается ещё не
                     переписанный код. Уходят по мере переписывания.

   Мост в Tailwind — блоки @theme в конце файла.

   Правило файла: одно имя живёт либо в @theme, либо в :root, но не в обоих.
   Исключение — @theme inline: он ничего не печатает в :root, поэтому пара
   `--radius-md` (тема Tailwind) + `--dashflow-radius-md` (:root) безопасна.
   ========================================================================== */

/* --- Слой 1. Структура --------------------------------------------------- */

:root {
  /* z-index. У Tailwind нет namespace --z-*, поэтому это обычные переменные:
     потребляются как z-[var(--z-modal)]. Заменяют магические z-40 и
     z-index: 100 из старого globals.css. */
  --z-base: 0;
  --z-raised: 10;
  --z-grid-item-active: 20;
  --z-rail: 30;
  --z-overlay: 40;
  --z-modal: 50;
  --z-toast: 60;

  /* Тайминги. Три шага, верхняя граница 250 ms (правило 19). */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 250ms;

  /* Составные значения для обычного CSS: transition: opacity var(--transition-fast). */
  --transition-fast: var(--duration-fast) var(--ease-expo);
  --transition-normal: var(--duration-normal) var(--ease-expo);
  --transition-slow: var(--duration-slow) var(--ease-expo);

  /* Тени. Выводятся из режима темы и в UI настроек не выносятся (спека, §6). */
  --shadow-1: 0 2px 10px rgb(0 0 0 / 0.3);
  --shadow-2: 0 8px 30px rgb(0 0 0 / 0.45);
  --shadow-3: 0 16px 50px rgb(0 0 0 / 0.6);
}

/* --- Слой 2. Значения темы. Дефолт — пресет Neutral Dark ---------------- */

:root {
  --dashflow-canvas: #0b0f17;
  --dashflow-surface: rgb(18 26 38 / 0.7);
  --dashflow-surface-hover: rgb(28 39 56 / 0.85);
  --dashflow-surface-active: rgb(35 49 70 / 0.95);

  --dashflow-primary: #3b82f6;
  --dashflow-primary-hover: #60a5fa;
  /* Текст на синей заливке. Тёмный, а не белый: #f8fafc на #3b82f6 даёт 3.52:1
     и проваливает WCAG AA, #0b0f17 на #3b82f6 даёт 5.21:1. Задача 6 проверяет
     это тестом, поэтому значение подобрано измерением, а не на глаз. */
  --dashflow-primary-fg: #0b0f17;

  --dashflow-secondary: #06b6d4;
  --dashflow-accent: #8b5cf6;

  --dashflow-fg: #f8fafc;
  --dashflow-fg-muted: #94a3b8;
  /* Приглушённый текст: даты, счётчики, подписи. Это настоящий текст, а не
     декор, поэтому 4.5:1 обязателен. slate-500 (#64748b) даёт 4.03:1 и не
     проходит; #748196 даёт 4.86:1 при почти том же оттенке. */
  --dashflow-fg-dim: #748196;

  --dashflow-line: rgb(255 255 255 / 0.08);
  --dashflow-line-hover: rgb(255 255 255 / 0.22);

  /* Семантические цвета. Закрывают дыру с захардкоженными text-rose-400 и
     text-emerald-400 по всему коду. */
  --dashflow-danger: #ef4444;
  --dashflow-warning: #f59e0b;
  --dashflow-success: #10b981;
  --dashflow-info: #38bdf8;

  /* Производные от primary. buildThemeCss пересчитывает их при смене темы. */
  --dashflow-primary-glow: rgb(59 130 246 / 0.35);
  --dashflow-line-glow: rgb(59 130 246 / 0.5);

  /* Фоновое свечение страницы. Раньше два radial-gradient были захардкожены
     в globals.css мимо палитры; теперь выводятся из accent и secondary. */
  --dashflow-ambient-1: rgb(139 92 246 / 0.15);
  --dashflow-ambient-2: rgb(6 182 212 / 0.08);

  /* Стекло. Настраиваются blur и opacity; фон и рамка — производные:
     glass-bg = surface с альфой glass-opacity, glass-border = fg с альфой 0.1.
     Значения ниже равны тому, что напечатает buildThemeCss для Neutral Dark
     (задача 5); задача 6 проверяет это равенство тестом. */
  --dashflow-glass-bg: rgb(18 26 38 / 0.65);
  --dashflow-glass-border: rgb(248 250 252 / 0.1);
  --dashflow-glass-blur: 24px;
  --dashflow-glass-opacity: 0.65;

  /* Радиус-пресет soft — текущие значения проекта, вид не меняется. */
  --dashflow-radius-xs: 6px;
  --dashflow-radius-sm: 10px;
  --dashflow-radius-md: 14px;
  --dashflow-radius-lg: 20px;
  --dashflow-radius-xl: 28px;

  /* Типографика. Все размеры в rem, поэтому масштаб — это множитель
     корневого font-size (см. globals.css), а не девять отдельных calc(). */
  --dashflow-font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  --dashflow-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --dashflow-font-scale: 1;
}

/* Обои. Не часть темы: живут отдельной настройкой и своим хранилищем.
   scrim по умолчанию 0 — без картинки затемнять нечего. */
:root {
  --app-bg-image: none;
  --app-scrim: 0;
}

/* --- Слой 3. Псевдонимы старых имён ------------------------------------- */
/* Каждый уходит вместе с последним потребителем; к концу этапа 6 блок пуст. */

:root {
  --color-bg: var(--dashflow-canvas);
  --color-surface: var(--dashflow-surface);
  --color-surface-hover: var(--dashflow-surface-hover);
  --color-surface-active: var(--dashflow-surface-active);
  --color-primary: var(--dashflow-primary);
  --color-primary-hover: var(--dashflow-primary-hover);
  --color-primary-glow: var(--dashflow-primary-glow);
  --color-secondary: var(--dashflow-secondary);
  --color-accent: var(--dashflow-accent);
  --color-text: var(--dashflow-fg);
  --color-text-muted: var(--dashflow-fg-muted);
  --color-text-dim: var(--dashflow-fg-dim);
  --color-border: var(--dashflow-line);
  --color-border-hover: var(--dashflow-line-hover);
  --color-border-glow: var(--dashflow-line-glow);
  --glass-bg: var(--dashflow-glass-bg);
  --glass-border: var(--dashflow-glass-border);
  --glass-blur: var(--dashflow-glass-blur);
  --font-family-base: var(--dashflow-font-sans);
  --font-family-mono: var(--dashflow-font-mono);
  --shadow-sm: var(--shadow-1);
  --shadow-md: var(--shadow-2);
  --shadow-lg: var(--shadow-3);
  --shadow-glow: 0 0 40px var(--dashflow-primary-glow);
}

/* --- Мост в Tailwind ---------------------------------------------------- */

/* Литеральные значения. Попадают в :root силами Tailwind. */
@theme {
  /* Шкала 12/13/14/16/20/24/32/48/64 px при масштабе 1.
     Шаг 13px назван по значению: свободного t-shirt-имени между xs и sm нет.
     text-lg (18px) и text-3xl…9xl вне шкалы и удалены; их последние
     потребители переписываются в задаче 12 и в этапе 4. */
  --text-xs: 0.75rem;
  --text-xs--line-height: 1rem;
  --text-13: 0.8125rem;
  --text-13--line-height: 1.125rem;
  --text-sm: 0.875rem;
  --text-sm--line-height: 1.25rem;
  --text-base: 1rem;
  --text-base--line-height: 1.5rem;
  --text-xl: 1.25rem;
  --text-xl--line-height: 1.75rem;
  --text-2xl: 1.5rem;
  --text-2xl--line-height: 2rem;
  --text-display-sm: 2rem;
  --text-display-sm--line-height: 2.5rem;
  --text-display-md: 3rem;
  --text-display-md--line-height: 3.25rem;
  --text-display-lg: 4rem;
  --text-display-lg--line-height: 4.25rem;
  --text-lg: initial;

  --ease-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Значения, ссылающиеся на другие переменные, — только inline: иначе Tailwind
   напечатал бы их копию в :root и получилось бы два источника правды. */
@theme inline {
  --color-canvas: var(--dashflow-canvas);
  --color-surface: var(--dashflow-surface);
  --color-surface-hover: var(--dashflow-surface-hover);
  --color-surface-active: var(--dashflow-surface-active);
  --color-primary: var(--dashflow-primary);
  --color-primary-hover: var(--dashflow-primary-hover);
  --color-primary-fg: var(--dashflow-primary-fg);
  --color-secondary: var(--dashflow-secondary);
  --color-accent: var(--dashflow-accent);
  --color-fg: var(--dashflow-fg);
  --color-fg-muted: var(--dashflow-fg-muted);
  --color-fg-dim: var(--dashflow-fg-dim);
  --color-line: var(--dashflow-line);
  --color-line-hover: var(--dashflow-line-hover);
  --color-danger: var(--dashflow-danger);
  --color-warning: var(--dashflow-warning);
  --color-success: var(--dashflow-success);
  --color-info: var(--dashflow-info);
  --color-glass: var(--dashflow-glass-bg);
  --color-glass-line: var(--dashflow-glass-border);

  /* Радиусы. Раньше tokens.css переопределял --radius-* в :root и по порядку
     каскада перебивал дефолты Tailwind: rounded-md молча означал 14px вместо
     6px. Теперь связь явная. rounded-2xl (5 потребителей в старом коде)
     отображён на шаг lg — минимальное визуальное отличие от прежних 16px. */
  --radius-xs: var(--dashflow-radius-xs);
  --radius-sm: var(--dashflow-radius-sm);
  --radius-md: var(--dashflow-radius-md);
  --radius-lg: var(--dashflow-radius-lg);
  --radius-xl: var(--dashflow-radius-xl);
  --radius-2xl: var(--dashflow-radius-lg);
  --radius-3xl: initial;
  --radius-4xl: initial;

  --font-sans: var(--dashflow-font-sans);
  --font-mono: var(--dashflow-font-mono);

  /* Анимации. Классы animate-in / fade-in / zoom-in-95 / slide-in-from-right
     в старом коде не работали: плагина tailwindcss-animate в проекте нет, а
     Tailwind 4 знает только spin / ping / pulse / bounce. */
  --animate-fade-in: fade-in var(--duration-normal) var(--ease-expo);
  --animate-scale-in: scale-in var(--duration-normal) var(--ease-expo);
  --animate-slide-in-right: slide-in-right var(--duration-slow) var(--ease-expo);
  --animate-slide-in-up: slide-in-up var(--duration-normal) var(--ease-expo);
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
}

@keyframes slide-in-right {
  from {
    transform: translateX(100%);
  }
}

@keyframes slide-in-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

/* --- Выключатель движения ----------------------------------------------- */
/* Не «покороче», а «мгновенно»: 1ms вместо 0 сохраняет события transitionend,
   на которые могут опираться компоненты. */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 1ms;
    --duration-normal: 1ms;
    --duration-slow: 1ms;
  }

  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Шаг 4: Убедиться, что контрактный тест проходит**

Run: `npx vitest run tests/unit/styles/tokens.contract.test.ts`
Expected: PASS — девять тестов.

- [ ] **Шаг 5: Полностью переписать `src/styles/globals.css`**

```css
@import 'tailwindcss';
@import './tokens.css';
@import 'react-grid-layout/css/styles.css';
@import 'react-resizable/css/styles.css';

@layer base {
  html {
    /* Масштаб типографики. Все размеры в rem, поэтому один множитель
       масштабирует текст и отступы вместе — это то же поведение, что у зума
       браузера, и оно нужно по правилу 16 и для 4K. */
    font-size: calc(16px * var(--dashflow-font-scale));

    /* Полосы прокрутки в Firefox. Раньше thumb был белым в обоих режимах и
       на светлой теме исчезал. */
    scrollbar-width: thin;
    scrollbar-color: var(--dashflow-line-hover) transparent;
  }

  body {
    min-height: 100vh;
    overflow-x: hidden;
    background-color: var(--dashflow-canvas);
    color: var(--dashflow-fg);
    font-family: var(--dashflow-font-sans);

    /* Фоновое свечение. Цвета берутся из темы, а не из захардкоженных rgba. */
    background-image: radial-gradient(
        ellipse 80% 80% at 50% -20%,
        var(--dashflow-ambient-1),
        transparent
      ),
      radial-gradient(ellipse 60% 60% at 80% 100%, var(--dashflow-ambient-2), transparent);
    background-attachment: fixed;
  }

  /* Обои и scrim одним слоем: scrim первым в списке, то есть поверх картинки.
     Отдельный ::after не подходит — он оказался бы над контентом. */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background-image: linear-gradient(
        rgb(0 0 0 / var(--app-scrim)),
        rgb(0 0 0 / var(--app-scrim))
      ),
      var(--app-bg-image);
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
  }

  /* Видимый фокус по умолчанию для всего приложения. Компоненты его уточняют,
     но никогда не убирают: focus:outline-none без замены — дефект (правило 16). */
  :focus-visible {
    outline: 2px solid var(--dashflow-primary);
    outline-offset: 2px;
  }
}

/* Стеклянная панель. Значения из темы, а не из литералов: на светлых обоях
   нужен другой blur и другая непрозрачность. */
.glass-panel {
  background-color: var(--dashflow-glass-bg);
  backdrop-filter: blur(var(--dashflow-glass-blur));
  -webkit-backdrop-filter: blur(var(--dashflow-glass-blur));
  border: 1px solid var(--dashflow-glass-border);
  box-shadow: var(--shadow-1);
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal),
    transform var(--transition-normal);
}

.glass-panel:hover {
  border-color: var(--dashflow-line-hover);
  box-shadow: 0 0 40px var(--dashflow-primary-glow);
}

/* --- react-grid-layout -------------------------------------------------- */

.react-grid-layout {
  position: relative;
  transition: height var(--transition-normal);
}

.react-grid-item {
  transition: all var(--transition-normal);
  transition-property: left, top, width, height;
}

.react-grid-item.cssTransforms {
  transition-property: transform, width, height;
}

.react-grid-item.resizing {
  z-index: var(--z-grid-item-active);
  will-change: width, height;
}

.react-grid-item.react-draggable-dragging {
  transition: none;
  z-index: var(--z-grid-item-active);
  will-change: transform;
}

/* Ручка ресайза. Было 14×14 px при opacity: 0 — то есть невидимая, но
   кликабельная область вдвое меньше минимума правила 16. Стало: 44×44 px
   зоны захвата, видимый уголок 10×10, и pointer-events выключены, пока
   ручка не показана, чтобы она не перехватывала клики по содержимому. */
.react-resizable-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  background: none;
  cursor: se-resize;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
}

.react-resizable-handle::after {
  content: '';
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 10px;
  height: 10px;
  border-right: 2px solid var(--dashflow-primary);
  border-bottom: 2px solid var(--dashflow-primary);
  border-bottom-right-radius: 2px;
}

.react-grid-item:hover .react-resizable-handle,
.react-grid-item:focus-within .react-resizable-handle {
  opacity: 1;
  pointer-events: auto;
}

/* --- Полосы прокрутки WebKit -------------------------------------------- */

::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--dashflow-line-hover);
  border-radius: var(--dashflow-radius-sm);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--dashflow-primary);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

- [ ] **Шаг 6: Написать тест-сторож на шкалы в коде этапа**

Область — каталоги этапа 1. Список расширяется в каждом следующем этапе теми каталогами, которые этап переписал; это тот же приём, что и `ignores` в `eslint.config.js`.

`tests/unit/styles/scale.guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '../../..');

/** Каталоги, переписанные к текущему этапу. Расширяется этапами 2-6. */
const SCOPE = ['src/core', 'src/ui', 'src/features/appearance'];

function sourceFiles(): { path: string; text: string }[] {
  const files: { path: string; text: string }[] = [];
  for (const dir of SCOPE) {
    const absolute = join(ROOT, dir);
    if (!existsSync(absolute)) continue;
    for (const entry of readdirSync(absolute, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(entry)) continue;
      const path = join(absolute, entry);
      files.push({ path: `${dir}/${entry}`, text: readFileSync(path, 'utf8') });
    }
  }
  return files;
}

const BANNED: { pattern: RegExp; reason: string }[] = [
  { pattern: /text-\[\d+px\]/, reason: 'произвольный размер шрифта вне шкалы' },
  { pattern: /\b[pmw]?[xytrbl]?-[0-9]+\.5\b/, reason: 'половинный шаг отступа вне шкалы' },
  { pattern: /\bz-(?:[0-9]+|auto)\b/, reason: 'магический z-index вместо z-[var(--z-*)]' },
  { pattern: /\bduration-(?:3\d\d|[4-9]\d\d|\d{4,})\b/, reason: 'анимация длиннее 250 ms' },
  {
    pattern:
      /\b(?:bg|text|border|ring|from|to|via)-(?:red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|slate|gray|zinc|neutral|stone)-\d{2,3}\b/,
    reason: 'цвет вне палитры темы',
  },
  { pattern: /\b(?:bg|text|border)-white\b/, reason: 'белый вне палитры темы' },
  { pattern: /animate-in|fade-in-|zoom-in-|slide-in-from-/, reason: 'класс несуществующего плагина tailwindcss-animate' },
];

describe('код этапа не выходит за шкалы дизайн-системы', () => {
  const files = sourceFiles();

  it('находит файлы для проверки', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { pattern, reason } of BANNED) {
    it(`не содержит: ${reason}`, () => {
      const offenders = files
        .filter((file) => pattern.test(file.text))
        .map((file) => file.path);
      expect(offenders).toEqual([]);
    });
  }
});
```

Половинные шаги: шаблон намеренно ловит и `p-0.5`. Шкала разрешает 2 px, но записывать его следует через `gap-0.5` крайне редко; если шаг действительно нужен, разрешение добавляется точечным исключением в этом тесте с обоснованием, а не расширением шаблона.

- [ ] **Шаг 7: Прогнать весь набор тестов**

Run: `npx vitest run`
Expected: PASS. Тест «находит файлы для проверки» упадёт, если `src/ui/lib/cn.ts` из задачи 1 отсутствует — это ожидаемая зависимость, задачи выполняются по порядку.

- [ ] **Шаг 8: Убрать удалённые Google Fonts из новой вкладки**

В `src/entrypoints/newtab/index.html` удалить три строки с `preconnect` и `stylesheet` на `fonts.googleapis.com` / `fonts.gstatic.com`.

Причина по правилу 32: каждое открытие новой вкладки сообщало Google факт и время открытия и IP пользователя. Расширению это не нужно, а CSP для MV3 (этап 6) внешний домен всё равно не пропустит. Шрифт по умолчанию — системный стек из `--dashflow-font-sans`; самостоятельный хостинг `Sofia Sans` и `JetBrains Mono` в `woff2` — отдельная задача этапа 6, ручка шрифта в теме для неё уже готова.

- [ ] **Шаг 9: Проверить типы и сборку**

Run: `npx tsc --noEmit && npx wxt build && npm run lint`
Expected: все три без ошибок.

- [ ] **Шаг 10: Проверить глазами, что старый интерфейс не сломался**

Run: `npm run dev`, открыть новую вкладку в подключённом профиле Chrome.
Ожидается: дашборд открывается, виджеты на месте, фон и стекло выглядят как раньше. Отличия, которые допустимы и ожидаемы: заголовок модалки без `text-lg` стал 16 px, скругление больших панелей 20 px вместо 16 px, системный шрифт вместо `Sofia Sans`. Любое другое расхождение — дефект этого шага, а не «особенность»: исправлять здесь.

- [ ] **Шаг 11: Коммит**

```bash
git add src/styles/tokens.css src/styles/globals.css src/entrypoints/newtab/index.html tests/unit/styles/
git commit -m "feat(design-system): трёхслойные токены и явный мост в Tailwind

Снята коллизия --radius-*: rounded-md означал 14px вместо 6px из-за
порядка @import. Добавлены шкалы z-index и типографики, настоящие
--animate-* вместо неработающих классов tailwindcss-animate,
выключатель prefers-reduced-motion. Обои и scrim вынесены в отдельный
слой. Удалены удалённые Google Fonts из новой вкладки.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Задача 4: Цветовая математика

Это фундамент движка тем: всё, что ниже по стеку, считает контраст, выводит
производные цвета и проверяет доступность через этот модуль. Файл чистый —
никакого DOM, никаких зависимостей, только функции над числами. Поэтому он
тестируется первым и полностью.

**Files:**
- Create: `src/core/theme/color.ts`
- Test: `tests/unit/theme/color.test.ts`

**Interfaces:**
- Consumes: ничего. Модуль не импортирует ни один файл проекта.
- Produces:
  ```ts
  export interface Rgba { r: number; g: number; b: number; a: number }
  export function parseColor(input: string): Rgba | null
  export function formatColor(color: Rgba): string
  export function withAlpha(color: Rgba, alpha: number): Rgba
  export function mix(a: Rgba, b: Rgba, weight: number): Rgba
  export function lighten(color: Rgba, amount: number): Rgba
  export function darken(color: Rgba, amount: number): Rgba
  export function flatten(fore: Rgba, back: Rgba): Rgba
  export function relativeLuminance(color: Rgba): number
  export function contrastRatio(a: Rgba, b: Rgba): number
  export function pickReadable(background: Rgba, candidates: Rgba[]): Rgba
  ```

**Границы модуля, решённые заранее (не переизобретать при реализации):**

- **Единственная точка разбора строк — `parseColor`.** Все остальные функции
  принимают уже разобранный `Rgba`. Это даёт задаче 5 право проверить весь
  набор токенов один раз и целиком откатиться на дефолтный пресет, а не
  подставлять тихие заглушки по одному значению (правило 34).
- **Именованные цвета (`red`, `tomato`) не поддерживаются** — это 148 имён
  ради удобства, которого в редакторе тем нет: пользователь выбирает цвет
  пипеткой и получает `#rrggbb`. `parseColor('red')` возвращает `null`.
- **Каналы за пределами диапазона обрезаются, а не отбрасываются** — так же
  ведёт себя CSS: `rgb(300 0 0)` это `rgb(255 0 0)`.
- **Каждая функция короче 30 строк** (правило 39). Если разбор не помещается —
  выносить приватные хелперы в тот же файл, а не раздувать одну функцию.

- [ ] **Шаг 1: Написать падающий тест**

Создать `tests/unit/theme/color.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  darken,
  flatten,
  formatColor,
  lighten,
  mix,
  parseColor,
  pickReadable,
  relativeLuminance,
  withAlpha,
  type Rgba,
} from '@/core/theme/color';

/** Разбирает заведомо валидный цвет. Падает, если разбор вернул null. */
function parse(input: string): Rgba {
  const color = parseColor(input);
  if (color === null) throw new Error(`ожидался валидный цвет: ${input}`);
  return color;
}

describe('parseColor', () => {
  it('разбирает шестизначный hex', () => {
    expect(parseColor('#0b0f17')).toEqual({ r: 11, g: 15, b: 23, a: 1 });
  });

  it('разбирает трёхзначный hex как удвоение символов', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#0af')).toEqual({ r: 0, g: 170, b: 255, a: 1 });
  });

  it('разбирает hex с альфой', () => {
    expect(parseColor('#0b0f17cc')).toEqual({ r: 11, g: 15, b: 23, a: 0.8 });
    expect(parseColor('#f00c')).toEqual({ r: 255, g: 0, b: 0, a: 0.8 });
  });

  it('не зависит от регистра и пробелов по краям', () => {
    expect(parseColor('  #0B0F17  ')).toEqual({ r: 11, g: 15, b: 23, a: 1 });
  });

  it('разбирает rgb() через запятые', () => {
    expect(parseColor('rgb(18, 26, 38)')).toEqual({ r: 18, g: 26, b: 38, a: 1 });
  });

  it('разбирает rgba() через запятые', () => {
    expect(parseColor('rgba(18, 26, 38, 0.7)')).toEqual({ r: 18, g: 26, b: 38, a: 0.7 });
  });

  it('разбирает современный синтаксис с пробелами и слешем', () => {
    expect(parseColor('rgb(18 26 38 / 0.65)')).toEqual({ r: 18, g: 26, b: 38, a: 0.65 });
  });

  it('разбирает альфу в процентах', () => {
    expect(parseColor('rgb(18 26 38 / 65%)')).toEqual({ r: 18, g: 26, b: 38, a: 0.65 });
  });

  it('разбирает каналы в процентах', () => {
    expect(parseColor('rgb(100% 0% 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('обрезает каналы и альфу по диапазону, как это делает CSS', () => {
    expect(parseColor('rgb(300 -20 38)')).toEqual({ r: 255, g: 0, b: 38, a: 1 });
    expect(parseColor('rgb(18 26 38 / 5)')).toEqual({ r: 18, g: 26, b: 38, a: 1 });
  });

  it('возвращает null на мусоре', () => {
    for (const bad of ['', '   ', 'red', '#12345', '#gg0000', 'rgb(1, 2)', 'rgb(a b c)', 'hsl(0 0% 0%)', 'var(--x)']) {
      expect(parseColor(bad)).toBeNull();
    }
  });
});

describe('formatColor', () => {
  it('печатает непрозрачный цвет без альфы', () => {
    expect(formatColor({ r: 11, g: 15, b: 23, a: 1 })).toBe('rgb(11 15 23)');
  });

  it('печатает полупрозрачный цвет со слешем', () => {
    expect(formatColor({ r: 18, g: 26, b: 38, a: 0.65 })).toBe('rgb(18 26 38 / 0.65)');
  });

  it('округляет каналы до целых, а альфу до трёх знаков', () => {
    expect(formatColor({ r: 17.6, g: 26.4, b: 38.2, a: 0.6666 })).toBe('rgb(18 26 38 / 0.667)');
  });

  it('делает цикл parse → format → parse устойчивым', () => {
    const once = parse('rgb(18 26 38 / 0.65)');
    expect(parse(formatColor(once))).toEqual(once);
  });
});

describe('withAlpha', () => {
  it('заменяет альфу и не трогает каналы', () => {
    expect(withAlpha(parse('#0b0f17'), 0.5)).toEqual({ r: 11, g: 15, b: 23, a: 0.5 });
  });

  it('обрезает альфу по диапазону', () => {
    expect(withAlpha(parse('#0b0f17'), 2).a).toBe(1);
    expect(withAlpha(parse('#0b0f17'), -1).a).toBe(0);
  });
});

describe('mix', () => {
  it('при весе 0 возвращает первый цвет, при весе 1 — второй', () => {
    const black = parse('#000000');
    const white = parse('#ffffff');
    expect(mix(black, white, 0)).toEqual(black);
    expect(mix(black, white, 1)).toEqual(white);
  });

  it('при весе 0.5 даёт середину', () => {
    expect(mix(parse('#000000'), parse('#ffffff'), 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('смешивает альфу вместе с каналами', () => {
    const result = mix(parse('rgb(0 0 0 / 0)'), parse('rgb(0 0 0 / 1)'), 0.5);
    expect(result.a).toBeCloseTo(0.5, 5);
  });
});

describe('lighten и darken', () => {
  it('lighten двигает цвет к белому', () => {
    expect(lighten(parse('#000000'), 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('darken двигает цвет к чёрному', () => {
    expect(darken(parse('#ffffff'), 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('сохраняют альфу', () => {
    expect(lighten(parse('rgb(0 0 0 / 0.4)'), 0.5).a).toBe(0.4);
    expect(darken(parse('rgb(255 255 255 / 0.4)'), 0.5).a).toBe(0.4);
  });

  it('насыщаются на границах, а не выходят за них', () => {
    expect(lighten(parse('#ffffff'), 0.5)).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(darken(parse('#000000'), 0.5)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});

describe('flatten', () => {
  it('накладывает полупрозрачный цвет на фон', () => {
    const result = flatten(parse('rgb(255 255 255 / 0.5)'), parse('#000000'));
    expect(result).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('полностью прозрачный передний план даёт чистый фон', () => {
    expect(flatten(parse('rgb(255 0 0 / 0)'), parse('#0b0f17'))).toEqual({ r: 11, g: 15, b: 23, a: 1 });
  });

  it('непрозрачный передний план скрывает фон', () => {
    expect(flatten(parse('#3b82f6'), parse('#0b0f17'))).toEqual({ r: 59, g: 130, b: 246, a: 1 });
  });
});

describe('relativeLuminance', () => {
  it('белый равен 1, чёрный равен 0', () => {
    expect(relativeLuminance(parse('#ffffff'))).toBeCloseTo(1, 6);
    expect(relativeLuminance(parse('#000000'))).toBeCloseTo(0, 6);
  });

  it('соответствует эталону WCAG для среднего серого', () => {
    expect(relativeLuminance(parse('#808080'))).toBeCloseTo(0.215861, 5);
  });
});

describe('contrastRatio', () => {
  it('белый на чёрном даёт максимум 21', () => {
    expect(contrastRatio(parse('#ffffff'), parse('#000000'))).toBeCloseTo(21, 4);
  });

  it('цвет сам с собой даёт 1', () => {
    expect(contrastRatio(parse('#3b82f6'), parse('#3b82f6'))).toBeCloseTo(1, 6);
  });

  it('симметричен', () => {
    const a = parse('#f8fafc');
    const b = parse('#0b0f17');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it('даёт измеренные значения для палитры Neutral Dark', () => {
    const canvas = parse('#0b0f17');
    expect(contrastRatio(parse('#f8fafc'), canvas)).toBeCloseTo(18.331, 2);
    expect(contrastRatio(parse('#94a3b8'), canvas)).toBeCloseTo(7.4801, 2);
    expect(contrastRatio(parse('#748196'), canvas)).toBeCloseTo(4.8616, 2);
  });
});

describe('pickReadable', () => {
  it('на синей заливке выбирает тёмный текст, а не белый', () => {
    const chosen = pickReadable(parse('#3b82f6'), [parse('#f8fafc'), parse('#0b0f17')]);
    expect(chosen).toEqual(parse('#0b0f17'));
  });

  it('на тёмном холсте выбирает светлый текст', () => {
    const chosen = pickReadable(parse('#0b0f17'), [parse('#f8fafc'), parse('#0b0f17')]);
    expect(chosen).toEqual(parse('#f8fafc'));
  });

  it('при равном контрасте берёт первого кандидата', () => {
    const first = parse('#ffffff');
    expect(pickReadable(parse('#808080'), [first, parse('#ffffff')])).toEqual(first);
  });

  it('бросает ошибку на пустом списке кандидатов', () => {
    expect(() => pickReadable(parse('#0b0f17'), [])).toThrow();
  });
});
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Запустить: `npx vitest run tests/unit/theme/color.test.ts`

Ожидается: FAIL с `Failed to resolve import "@/core/theme/color"`. Модуля ещё нет — это правильная причина падения.

- [ ] **Шаг 3: Написать реализацию**

Создать `src/core/theme/color.ts`:

```ts
/**
 * Цветовая математика движка тем. Чистый модуль: без DOM, без зависимостей.
 *
 * Единственная точка разбора строк — parseColor. Остальные функции принимают
 * уже разобранный Rgba, поэтому вызывающий код проверяет ввод один раз и целиком,
 * а не подставляет заглушки по одному значению.
 */

/** Цвет в sRGB. Каналы 0–255, альфа 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3,8})$/i;
const RGB_PATTERN = /^rgba?\(([^()]*)\)$/i;

/** Ограничивает значение отрезком [min, max]. NaN превращается в min. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Удваивает символы короткой hex-записи: 'f0a' → 'ff00aa'. */
function expandShortHex(digits: string): string {
  let expanded = '';
  for (const digit of digits) expanded += digit + digit;
  return expanded;
}

function parseHex(input: string): Rgba | null {
  const match = HEX_PATTERN.exec(input);
  if (match === null) return null;

  const digits = match[1];
  const full = digits.length === 3 || digits.length === 4 ? expandShortHex(digits) : digits;
  if (full.length !== 6 && full.length !== 8) return null;

  const channel = (offset: number): number => parseInt(full.slice(offset, offset + 2), 16);
  const alpha = full.length === 8 ? channel(6) / 255 : 1;
  return { r: channel(0), g: channel(2), b: channel(4), a: alpha };
}

/** Разбирает один компонент rgb(): число либо процент. NaN на нечисловом вводе. */
function parseComponent(token: string, scale: number): number {
  const trimmed = token.trim();
  if (trimmed === '') return Number.NaN;
  if (trimmed.endsWith('%')) {
    const percent = Number(trimmed.slice(0, -1));
    return Number.isNaN(percent) ? Number.NaN : (percent / 100) * scale;
  }
  return Number(trimmed);
}

function parseRgb(input: string): Rgba | null {
  const match = RGB_PATTERN.exec(input);
  if (match === null) return null;

  const body = match[1].trim();
  const [channelPart, alphaPart] = body.includes('/') ? body.split('/') : [body, undefined];
  const channels = channelPart.trim().split(/[\s,]+/).filter((token) => token !== '');

  // Форма rgba(r, g, b, a) кладёт альфу четвёртым токеном, а не за слешем.
  const rawAlpha = alphaPart ?? (channels.length === 4 ? channels.pop() : undefined);
  if (channels.length !== 3) return null;

  const rgb = channels.map((token) => parseComponent(token, 255));
  if (rgb.some((value) => Number.isNaN(value))) return null;

  const alpha = rawAlpha === undefined ? 1 : parseComponent(rawAlpha, 1);
  if (Number.isNaN(alpha)) return null;

  return {
    r: clamp(Math.round(rgb[0]), 0, 255),
    g: clamp(Math.round(rgb[1]), 0, 255),
    b: clamp(Math.round(rgb[2]), 0, 255),
    a: clamp(alpha, 0, 1),
  };
}

/**
 * Разбирает CSS-цвет. Поддерживаются #rgb, #rgba, #rrggbb, #rrggbbaa,
 * rgb()/rgba() в запятой, пробельной и слеш-форме, каналы и альфа в процентах.
 * Именованные цвета не поддерживаются намеренно: редактор тем всегда даёт hex.
 * Возвращает null на любом другом вводе — вызывающий код обязан это обработать.
 */
export function parseColor(input: string): Rgba | null {
  const normalized = input.trim();
  if (normalized === '') return null;
  return normalized.startsWith('#') ? parseHex(normalized) : parseRgb(normalized.toLowerCase());
}

/** Печатает цвет в современном CSS-синтаксисе. Альфа опускается, если она равна 1. */
export function formatColor(color: Rgba): string {
  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);
  if (color.a >= 1) return `rgb(${r} ${g} ${b})`;
  const alpha = Number(color.a.toFixed(3));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

/** Возвращает копию цвета с другой альфой. */
export function withAlpha(color: Rgba, alpha: number): Rgba {
  return { r: color.r, g: color.g, b: color.b, a: clamp(alpha, 0, 1) };
}

/** Линейно смешивает два цвета. weight = 0 даёт a, weight = 1 даёт b. */
export function mix(a: Rgba, b: Rgba, weight: number): Rgba {
  const t = clamp(weight, 0, 1);
  const blend = (from: number, to: number): number => Math.round(from + (to - from) * t);
  return {
    r: blend(a.r, b.r),
    g: blend(a.g, b.g),
    b: blend(a.b, b.b),
    a: a.a + (b.a - a.a) * t,
  };
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

/** Осветляет цвет, сдвигая его к белому. Альфа сохраняется. */
export function lighten(color: Rgba, amount: number): Rgba {
  return withAlpha(mix(color, WHITE, amount), color.a);
}

/** Затемняет цвет, сдвигая его к чёрному. Альфа сохраняется. */
export function darken(color: Rgba, amount: number): Rgba {
  return withAlpha(mix(color, BLACK, amount), color.a);
}

/**
 * Накладывает полупрозрачный цвет на непрозрачный фон и возвращает результат.
 * Нужен для измерения контраста на стеклянных поверхностях: контраст определён
 * только для непрозрачных пар.
 */
export function flatten(fore: Rgba, back: Rgba): Rgba {
  return withAlpha(mix(back, fore, fore.a), 1);
}

/** Переводит канал sRGB в линейное пространство по формуле WCAG 2.1. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Относительная яркость по WCAG 2.1. Белый даёт 1, чёрный — 0. Альфа игнорируется. */
export function relativeLuminance(color: Rgba): number {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

/** Коэффициент контраста по WCAG 2.1: от 1 (одинаковые) до 21 (белый и чёрный). */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Выбирает кандидата с наибольшим контрастом к фону. При равенстве побеждает
 * тот, кто идёт раньше в списке, поэтому порядок кандидатов задаёт предпочтение.
 */
export function pickReadable(background: Rgba, candidates: Rgba[]): Rgba {
  const first = candidates[0];
  if (first === undefined) throw new Error('pickReadable: список кандидатов пуст');

  let best = first;
  let bestRatio = contrastRatio(background, first);
  for (const candidate of candidates.slice(1)) {
    const ratio = contrastRatio(background, candidate);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Запустить: `npx vitest run tests/unit/theme/color.test.ts`

Ожидается: PASS, 37 тестов в 9 блоках `describe`.

Если падает `parseColor('rgb(1, 2)')` — проверить, что ветка `channels.length !== 3` возвращает `null` до разбора альфы. Если падает округление в `mix` — числа округляются у каналов, но не у альфы, это намеренно.

- [ ] **Шаг 5: Проверить типы и линтер**

Запустить: `npx tsc --noEmit`

Ожидается: без ошибок.

Запустить: `npm run lint`

Ожидается: без ошибок. Файл попадает в область гейта из задачи 2 (`src/core`).

- [ ] **Шаг 6: Коммит**

```bash
git add src/core/theme/color.ts tests/unit/theme/color.test.ts
git commit -m "$(cat <<'EOF'
feat(theme): цветовая математика для движка тем

Чистый модуль без DOM: разбор и печать CSS-цветов, смешивание,
осветление, наложение на фон, яркость и контраст по WCAG 2.1,
выбор читаемого текста на произвольной заливке.

Единственная точка разбора строк — parseColor, остальные функции
принимают уже разобранный Rgba.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Задача 5: Контракт темы и печать CSS

**Файлы:**
- Создать: `src/core/theme/tokens.ts`
- Тест: `tests/unit/theme/tokens.test.ts`

**Интерфейсы:**
- Потребляет из задачи 4: `parseColor`, `formatColor`, `withAlpha`, `mix`, `lighten`, `pickReadable`, тип `Rgba` из `@/core/theme/color`.
- Производит:

```ts
export const COLOR_KEYS: readonly ColorKey[]                    // 24 ключа
export type ColorKey = 'canvas' | 'surface' | … | 'glassBorder'
export const RADIUS_STEPS: readonly RadiusStep[]                // xs sm md lg xl
export type RadiusStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type RadiusScale = Record<RadiusStep, string>
export const RADIUS_SCALE_NAMES: readonly RadiusScaleName[]     // sharp soft round
export type RadiusScaleName = 'sharp' | 'soft' | 'round'
export const RADIUS_SCALES: Record<RadiusScaleName, RadiusScale>
export interface ThemeTokens                                    // 7 обязательных + 17 цветовых + 6 скаляров
export interface ResolvedTheme                                  // colors: Record<ColorKey, Rgba> + скаляры
export function resolveTheme(tokens: ThemeTokens): ResolvedTheme | null
export function themeCssVarName(key: ColorKey): string
export function buildThemeCss(theme: ResolvedTheme): string
```

Четыре решения, принятые здесь, чтобы их не пересматривали в задачах 6–10.

**Обязательных ключей семь, остальные семнадцать выводятся.** Пресет описывает `canvas`, `surface`, `primary`, `secondary`, `accent`, `fg`, `line` — этого достаточно, чтобы собрать полную тему. Иначе каждый из девяти пресетов задачи 6 пришлось бы писать на двадцать четыре значения вручную, и любое расхождение между ними осталось бы незамеченным. При этом переопределить можно любой ключ: High Contrast в задаче 6 задаёт свои значения там, где вывод даёт недостаточный контраст.

**`resolveTheme` возвращает `null` на весь набор, а не подставляет отдельные дефолты.** Если хотя бы одно значение непригодно, набор непригоден целиком. Задача 9 на `null` откатывается на пресет по умолчанию — пользователь видит рабочую тему и сообщение об ошибке. Молчаливая подстановка отдельных значений скрыла бы повреждение данных и нарушила правило 34.

**Тема — недоверенный ввод (правило 32).** Значения приходят из `chrome.storage` и из манифестов плагинов, где типов нет, и печатаются внутрь `<style>`. Поэтому проверяется каждое: цвета — через `parseColor`, длины — шаблоном `LENGTH_PATTERN`, шрифты — allowlist-шаблоном `FONT_PATTERN`, числа — диапазоном и `Number.isFinite`, имя шкалы радиусов — вхождением в `RADIUS_SCALE_NAMES`. Ни `;`, ни `{`, ни `}`, ни `url(` сквозь шаблоны не проходят, поэтому закрыть объявление и дописать свой селектор нельзя. Функция никогда не бросает исключение на любом вводе — это то, что делает откат в задаче 9 доказуемым.

**`buildThemeCss` нормализует все цвета в `rgb()`.** Авторский `#0b0f17` печатается как `rgb(11 15 23)`. Это намеренно: одна форма записи на выходе означает, что задача 6 сравнивает разобранные цвета, а не строки, и что редактор темы в задаче 14 показывает пользователю ровно то, что применится. Тест задачи 6 «`tokens.css` совпадает с `buildThemeCss(NEUTRAL_DARK)`» сравнивает значения через `parseColor`, поэтому `tokens.css` остаётся читаемым для человека и хранит hex.

- [ ] **Шаг 1: Написать падающий тест**

Создать `tests/unit/theme/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contrastRatio, formatColor, relativeLuminance } from '@/core/theme/color';
import {
  buildThemeCss,
  COLOR_KEYS,
  RADIUS_SCALES,
  resolveTheme,
  themeCssVarName,
  type ColorKey,
  type ResolvedTheme,
  type ThemeTokens,
} from '@/core/theme/tokens';

/** Семь обязательных ключей — минимум, на котором тема обязана собраться. */
const BASE: ThemeTokens = {
  canvas: '#0b0f17',
  surface: 'rgb(18 26 38 / 0.7)',
  primary: '#3b82f6',
  secondary: '#06b6d4',
  accent: '#8b5cf6',
  fg: '#f8fafc',
  line: 'rgb(255 255 255 / 0.08)',
};

function resolve(patch: Partial<ThemeTokens> = {}): ResolvedTheme {
  const theme = resolveTheme({ ...BASE, ...patch });
  if (theme === null) throw new Error('resolveTheme неожидаемо вернул null');
  return theme;
}

/**
 * Тема приходит из chrome.storage, где типов нет. Единственное приведение в
 * файле моделирует именно это: данные, не соответствующие ThemeTokens.
 */
function resolveRaw(patch: Record<string, unknown>): ResolvedTheme | null {
  return resolveTheme({ ...BASE, ...patch } as ThemeTokens);
}

/** Разбирает напечатанный CSS в карту «имя переменной → значение». */
function declarations(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of source.split('\n')) {
    const match = /^\s*(--dashflow-[a-z0-9-]+):\s*(.+);$/.exec(line);
    if (match !== null) map.set(match[1], match[2]);
  }
  return map;
}

describe('COLOR_KEYS', () => {
  it('содержит 24 ключа', () => {
    expect(COLOR_KEYS).toHaveLength(24);
  });

  it('не содержит повторов', () => {
    expect(new Set(COLOR_KEYS).size).toBe(COLOR_KEYS.length);
  });
});

describe('resolveTheme — обязательные ключи', () => {
  it('собирает полную тему из семи ключей', () => {
    expect(Object.keys(resolve().colors)).toHaveLength(24);
  });

  it.each(['canvas', 'surface', 'primary', 'secondary', 'accent', 'fg', 'line'])(
    'отклоняет набор без ключа %s',
    (key) => {
      expect(resolveRaw({ [key]: undefined })).toBeNull();
    },
  );

  it('отклоняет набор с неразбираемым цветом', () => {
    expect(resolveRaw({ primary: 'не цвет' })).toBeNull();
  });

  it('отклоняет нестроковый цвет', () => {
    expect(resolveRaw({ primary: 42 })).toBeNull();
  });
});

describe('resolveTheme — вывод оттенков', () => {
  it('осветляет surface для наведения', () => {
    expect(resolve().colors.surfaceHover).toEqual({ r: 37, g: 44, b: 55, a: 0.7 });
  });

  it('осветляет surface сильнее для нажатия', () => {
    expect(resolve().colors.surfaceActive).toEqual({ r: 56, g: 63, b: 73, a: 0.7 });
  });

  it('отдаёт приоритет авторскому surfaceHover', () => {
    expect(resolve({ surfaceHover: '#123456' }).colors.surfaceHover).toEqual({
      r: 18,
      g: 52,
      b: 86,
      a: 1,
    });
  });

  it('выбирает тёмный текст на синей заливке', () => {
    const theme = resolve();
    expect(theme.colors.primaryFg).toEqual(theme.colors.canvas);
  });

  it('держит контраст текста на заливке не ниже 4.5:1', () => {
    const theme = resolve();
    expect(contrastRatio(theme.colors.primary, theme.colors.primaryFg)).toBeGreaterThanOrEqual(4.5);
  });

  it('располагает приглушённые оттенки между fg и canvas', () => {
    const { canvas, fg, fgMuted, fgDim } = resolve().colors;
    const l = (color: typeof canvas): number => relativeLuminance(color);
    expect(l(canvas)).toBeLessThan(l(fgDim));
    expect(l(fgDim)).toBeLessThan(l(fgMuted));
    expect(l(fgMuted)).toBeLessThan(l(fg));
  });

  it('усиливает альфу линии при наведении', () => {
    expect(resolve().colors.lineHover.a).toBeCloseTo(0.2, 10);
  });

  it('не выводит альфу линии за единицу', () => {
    expect(resolve({ line: 'rgb(255 255 255 / 0.5)' }).colors.lineHover.a).toBe(1);
  });

  it('строит стекло из surface с прозрачностью темы', () => {
    const theme = resolve();
    expect(theme.colors.glassBg).toEqual({ ...theme.colors.surface, a: 0.65 });
  });

  it('следует за изменением glassOpacity', () => {
    expect(resolve({ glassOpacity: 0.4 }).colors.glassBg.a).toBe(0.4);
  });

  it('строит границу стекла из fg', () => {
    expect(resolve().colors.glassBorder).toEqual({ r: 248, g: 250, b: 252, a: 0.1 });
  });

  it('выводит свечения из primary', () => {
    const { primaryGlow, lineGlow } = resolve().colors;
    expect(primaryGlow).toEqual({ r: 59, g: 130, b: 246, a: 0.35 });
    expect(lineGlow).toEqual({ r: 59, g: 130, b: 246, a: 0.5 });
  });

  it('выводит фоновые пятна из accent и secondary', () => {
    const { ambient1, ambient2 } = resolve().colors;
    expect(ambient1).toEqual({ r: 139, g: 92, b: 246, a: 0.15 });
    expect(ambient2).toEqual({ r: 6, g: 182, b: 212, a: 0.08 });
  });

  it('подставляет статусные цвета по умолчанию', () => {
    const { danger, warning, success, info } = resolve().colors;
    expect(formatColor(danger)).toBe('rgb(239 68 68)');
    expect(formatColor(warning)).toBe('rgb(245 158 11)');
    expect(formatColor(success)).toBe('rgb(16 185 129)');
    expect(formatColor(info)).toBe('rgb(56 189 248)');
  });

  it('отдаёт приоритет авторскому статусному цвету', () => {
    expect(resolve({ danger: '#ff0000' }).colors.danger).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });
});

describe('resolveTheme — скаляры', () => {
  it('подставляет дефолты скаляров', () => {
    const theme = resolve();
    expect(theme.glassBlur).toBe('24px');
    expect(theme.glassOpacity).toBe(0.65);
    expect(theme.fontScale).toBe(1);
    expect(theme.radius).toEqual(RADIUS_SCALES.soft);
  });

  it('принимает корректную длину размытия', () => {
    expect(resolve({ glassBlur: '12px' }).glassBlur).toBe('12px');
  });

  it.each(['12', '12em', 'calc(1px)', '24px; } * { color: red', '1000px'])(
    'отклоняет размытие %s',
    (value) => {
      expect(resolveRaw({ glassBlur: value })).toBeNull();
    },
  );

  it('принимает прозрачность в диапазоне', () => {
    expect(resolve({ glassOpacity: 0.4 }).glassOpacity).toBe(0.4);
  });

  it.each([1.5, -0.1, Number.NaN, '0.5'])('отклоняет прозрачность %s', (value) => {
    expect(resolveRaw({ glassOpacity: value })).toBeNull();
  });

  it('принимает масштаб шрифта в диапазоне', () => {
    expect(resolve({ fontScale: 1.25 }).fontScale).toBe(1.25);
  });

  it.each([0.5, 2, Number.NaN])('отклоняет масштаб шрифта %s', (value) => {
    expect(resolveRaw({ fontScale: value })).toBeNull();
  });

  it('разворачивает имя шкалы радиусов в саму шкалу', () => {
    expect(resolve({ radius: 'sharp' }).radius).toEqual(RADIUS_SCALES.sharp);
  });

  it('отклоняет неизвестную шкалу радиусов', () => {
    expect(resolveRaw({ radius: 'huge' })).toBeNull();
  });

  it('принимает список шрифтов', () => {
    const fontSans = "Inter, 'Segoe UI', sans-serif";
    expect(resolve({ fontSans }).fontSans).toBe(fontSans);
  });

  it.each(['Inter; } body { display: none', 'url(https://evil.example/x)', 'Inter{}', '', 123])(
    'отклоняет небезопасный шрифт %s',
    (value) => {
      expect(resolveRaw({ fontSans: value })).toBeNull();
    },
  );
});

describe('themeCssVarName', () => {
  it.each([
    ['canvas', '--dashflow-canvas'],
    ['surfaceHover', '--dashflow-surface-hover'],
    ['primaryFg', '--dashflow-primary-fg'],
    ['glassBg', '--dashflow-glass-bg'],
    ['ambient1', '--dashflow-ambient-1'],
  ] as [ColorKey, string][])('превращает %s в %s', (key, expected) => {
    expect(themeCssVarName(key)).toBe(expected);
  });
});

describe('buildThemeCss', () => {
  it('оборачивает объявления в :root', () => {
    const css = buildThemeCss(resolve());
    expect(css.startsWith(':root {\n')).toBe(true);
    expect(css.endsWith('}\n')).toBe(true);
  });

  it('печатает 34 объявления', () => {
    expect(declarations(buildThemeCss(resolve())).size).toBe(34);
  });

  it('печатает все цветовые ключи', () => {
    const printed = declarations(buildThemeCss(resolve()));
    for (const key of COLOR_KEYS) {
      expect(printed.has(themeCssVarName(key))).toBe(true);
    }
  });

  it('нормализует hex в современный rgb()', () => {
    const printed = declarations(buildThemeCss(resolve()));
    expect(printed.get('--dashflow-canvas')).toBe('rgb(11 15 23)');
  });

  it('сохраняет альфу при печати', () => {
    const printed = declarations(buildThemeCss(resolve()));
    expect(printed.get('--dashflow-surface')).toBe('rgb(18 26 38 / 0.7)');
  });

  it('печатает выбранную шкалу радиусов', () => {
    const printed = declarations(buildThemeCss(resolve({ radius: 'sharp' })));
    expect(printed.get('--dashflow-radius-xs')).toBe('2px');
    expect(printed.get('--dashflow-radius-xl')).toBe('14px');
  });

  it('печатает шрифты, размытие и масштаб', () => {
    const printed = declarations(buildThemeCss(resolve({ fontScale: 1.25 })));
    expect(printed.get('--dashflow-glass-blur')).toBe('24px');
    expect(printed.get('--dashflow-font-scale')).toBe('1.25');
    expect(printed.get('--dashflow-font-sans')).toContain('system-ui');
    expect(printed.get('--dashflow-font-mono')).toContain('ui-monospace');
  });

  it('не печатает ничего сверх контракта', () => {
    const printed = declarations(buildThemeCss(resolve()));
    const expected = [
      ...COLOR_KEYS.map(themeCssVarName),
      '--dashflow-glass-blur',
      '--dashflow-glass-opacity',
      '--dashflow-radius-xs',
      '--dashflow-radius-sm',
      '--dashflow-radius-md',
      '--dashflow-radius-lg',
      '--dashflow-radius-xl',
      '--dashflow-font-sans',
      '--dashflow-font-mono',
      '--dashflow-font-scale',
    ];
    expect([...printed.keys()].sort()).toEqual([...expected].sort());
  });
});
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Запустить: `npx vitest run tests/unit/theme/tokens.test.ts`

Ожидается: FAIL с `Failed to resolve import "@/core/theme/tokens"`.

- [ ] **Шаг 3: Написать реализацию**

Создать `src/core/theme/tokens.ts`:

```ts
import {
  formatColor,
  lighten,
  mix,
  parseColor,
  pickReadable,
  withAlpha,
  type Rgba,
} from './color';

/** Цветовые ключи темы. Единственный источник истины для печати и тестов. */
export const COLOR_KEYS = [
  'canvas',
  'surface',
  'surfaceHover',
  'surfaceActive',
  'primary',
  'primaryHover',
  'primaryFg',
  'secondary',
  'accent',
  'fg',
  'fgMuted',
  'fgDim',
  'line',
  'lineHover',
  'danger',
  'warning',
  'success',
  'info',
  'primaryGlow',
  'lineGlow',
  'ambient1',
  'ambient2',
  'glassBg',
  'glassBorder',
] as const;

export type ColorKey = (typeof COLOR_KEYS)[number];

export const RADIUS_STEPS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type RadiusStep = (typeof RADIUS_STEPS)[number];
export type RadiusScale = Record<RadiusStep, string>;

export const RADIUS_SCALE_NAMES = ['sharp', 'soft', 'round'] as const;
export type RadiusScaleName = (typeof RADIUS_SCALE_NAMES)[number];

export const RADIUS_SCALES: Record<RadiusScaleName, RadiusScale> = {
  sharp: { xs: '2px', sm: '4px', md: '6px', lg: '10px', xl: '14px' },
  soft: { xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '28px' },
  round: { xs: '10px', sm: '16px', md: '22px', lg: '30px', xl: '40px' },
};

/** Набор токенов темы: семь ключей обязательны, остальное выводится. */
export interface ThemeTokens {
  canvas: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  fg: string;
  line: string;

  surfaceHover?: string;
  surfaceActive?: string;
  primaryHover?: string;
  primaryFg?: string;
  fgMuted?: string;
  fgDim?: string;
  lineHover?: string;
  danger?: string;
  warning?: string;
  success?: string;
  info?: string;
  primaryGlow?: string;
  lineGlow?: string;
  ambient1?: string;
  ambient2?: string;
  glassBg?: string;
  glassBorder?: string;

  glassBlur?: string;
  glassOpacity?: number;
  radius?: RadiusScaleName;
  fontSans?: string;
  fontMono?: string;
  fontScale?: number;
}

/** Тема после проверки и вывода: готова к печати, без строковых неизвестных. */
export interface ResolvedTheme {
  colors: Record<ColorKey, Rgba>;
  glassBlur: string;
  glassOpacity: number;
  radius: RadiusScale;
  fontSans: string;
  fontMono: string;
  fontScale: number;
}

const DANGER_DEFAULT = '#ef4444';
const WARNING_DEFAULT = '#f59e0b';
const SUCCESS_DEFAULT = '#10b981';
const INFO_DEFAULT = '#38bdf8';

const FONT_SANS_DEFAULT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO_DEFAULT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const LENGTH_PATTERN = /^(?:0|[1-9]\d{0,2})(?:\.\d+)?px$/;
const FONT_PATTERN = /^[A-Za-z0-9\s,'"._-]{1,200}$/;

/**
 * Читает строковый скаляр. Значение попадёт внутрь <style>, поэтому проходит
 * через allowlist: ни ';', ни '{', ни '}', ни 'url(' сквозь шаблон не пройдут.
 */
function readString(value: unknown, pattern: RegExp, fallback: string): string | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !pattern.test(value)) return null;
  return value;
}

function readNumber(value: unknown, min: number, max: number, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

function requireColor(value: string): Rgba {
  const parsed = parseColor(value);
  if (parsed === null) throw new Error(`внутренний дефолт невалиден: ${value}`);
  return parsed;
}

function parseAuthored(tokens: ThemeTokens): Partial<Record<ColorKey, Rgba>> | null {
  const authored: Partial<Record<ColorKey, Rgba>> = {};
  for (const key of COLOR_KEYS) {
    const raw: unknown = tokens[key];
    if (raw === undefined) continue;
    if (typeof raw !== 'string') return null;
    const parsed = parseColor(raw);
    if (parsed === null) return null;
    authored[key] = parsed;
  }
  return authored;
}

function deriveColors(
  authored: Partial<Record<ColorKey, Rgba>>,
  glassOpacity: number,
): Record<ColorKey, Rgba> | null {
  const { canvas, surface, primary, secondary, accent, fg, line } = authored;
  if (
    canvas === undefined ||
    surface === undefined ||
    primary === undefined ||
    secondary === undefined ||
    accent === undefined ||
    fg === undefined ||
    line === undefined
  ) {
    return null;
  }

  return {
    canvas,
    surface,
    surfaceHover: authored.surfaceHover ?? lighten(surface, 0.08),
    surfaceActive: authored.surfaceActive ?? lighten(surface, 0.16),
    primary,
    primaryHover: authored.primaryHover ?? lighten(primary, 0.15),
    primaryFg: authored.primaryFg ?? pickReadable(primary, [fg, canvas]),
    secondary,
    accent,
    fg,
    fgMuted: authored.fgMuted ?? mix(fg, canvas, 0.45),
    fgDim: authored.fgDim ?? mix(fg, canvas, 0.62),
    line,
    lineHover: authored.lineHover ?? withAlpha(line, Math.min(1, line.a * 2.5)),
    danger: authored.danger ?? requireColor(DANGER_DEFAULT),
    warning: authored.warning ?? requireColor(WARNING_DEFAULT),
    success: authored.success ?? requireColor(SUCCESS_DEFAULT),
    info: authored.info ?? requireColor(INFO_DEFAULT),
    primaryGlow: authored.primaryGlow ?? withAlpha(primary, 0.35),
    lineGlow: authored.lineGlow ?? withAlpha(primary, 0.5),
    ambient1: authored.ambient1 ?? withAlpha(accent, 0.15),
    ambient2: authored.ambient2 ?? withAlpha(secondary, 0.08),
    glassBg: authored.glassBg ?? withAlpha(surface, glassOpacity),
    glassBorder: authored.glassBorder ?? withAlpha(fg, 0.1),
  };
}

function resolveScalars(tokens: ThemeTokens): Omit<ResolvedTheme, 'colors'> | null {
  const glassBlur = readString(tokens.glassBlur, LENGTH_PATTERN, '24px');
  const fontSans = readString(tokens.fontSans, FONT_PATTERN, FONT_SANS_DEFAULT);
  const fontMono = readString(tokens.fontMono, FONT_PATTERN, FONT_MONO_DEFAULT);
  const glassOpacity = readNumber(tokens.glassOpacity, 0, 1, 0.65);
  const fontScale = readNumber(tokens.fontScale, 0.75, 1.5, 1);
  const radiusName = tokens.radius ?? 'soft';

  if (glassBlur === null || fontSans === null || fontMono === null) return null;
  if (glassOpacity === null || fontScale === null) return null;
  if (!RADIUS_SCALE_NAMES.includes(radiusName)) return null;

  return {
    glassBlur,
    glassOpacity,
    radius: RADIUS_SCALES[radiusName],
    fontSans,
    fontMono,
    fontScale,
  };
}

/**
 * Приводит набор токенов к полной теме: проверяет скаляры, разбирает авторские
 * цвета и выводит остальные. null означает «набор непригоден целиком» —
 * вызывающий откатывается на пресет по умолчанию, а не подставляет отдельные
 * значения молча. Функция не бросает исключений ни на каком вводе.
 */
export function resolveTheme(tokens: ThemeTokens): ResolvedTheme | null {
  const scalars = resolveScalars(tokens);
  if (scalars === null) return null;

  const authored = parseAuthored(tokens);
  if (authored === null) return null;

  const colors = deriveColors(authored, scalars.glassOpacity);
  if (colors === null) return null;

  return { colors, ...scalars };
}

/** Имя CSS-переменной для цветового ключа: ambient1 → --dashflow-ambient-1. */
export function themeCssVarName(key: ColorKey): string {
  const kebab = key
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/(\d+)/g, '-$1');
  return `--dashflow-${kebab}`;
}

/** Печатает тему как блок :root. Все цвета нормализуются в современный rgb(). */
export function buildThemeCss(theme: ResolvedTheme): string {
  const lines = COLOR_KEYS.map(
    (key) => `  ${themeCssVarName(key)}: ${formatColor(theme.colors[key])};`,
  );
  lines.push(`  --dashflow-glass-blur: ${theme.glassBlur};`);
  lines.push(`  --dashflow-glass-opacity: ${theme.glassOpacity};`);
  for (const step of RADIUS_STEPS) {
    lines.push(`  --dashflow-radius-${step}: ${theme.radius[step]};`);
  }
  lines.push(`  --dashflow-font-sans: ${theme.fontSans};`);
  lines.push(`  --dashflow-font-mono: ${theme.fontMono};`);
  lines.push(`  --dashflow-font-scale: ${theme.fontScale};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Запустить: `npx vitest run tests/unit/theme/tokens.test.ts`

Ожидается: PASS, 63 проверки в 6 блоках `describe`.

Если падает `отклоняет размытие 1000px` — шаблон `LENGTH_PATTERN` намеренно ограничен тремя цифрами: размытие больше 999px не имеет смысла и лишь тормозит композитор. Если падает `не печатает ничего сверх контракта` — сверить список с `--dashflow-*` из задачи 3: имена печатаются из `COLOR_KEYS`, поэтому расхождение означает опечатку в `themeCssVarName`.

- [ ] **Шаг 5: Проверить типы и линтер**

Запустить: `npx tsc --noEmit`

Ожидается: без ошибок.

Запустить: `npm run lint`

Ожидается: без ошибок.

- [ ] **Шаг 6: Коммит**

```bash
git add src/core/theme/tokens.ts tests/unit/theme/tokens.test.ts
git commit -m "$(cat <<'EOF'
feat(theme): контракт темы и печать CSS-переменных

ThemeTokens описывает семь обязательных ключей, остальные семнадцать
цветов выводятся из них. resolveTheme проверяет весь набор и возвращает
null целиком, если хотя бы одно значение непригодно, — вызывающий
откатывается на пресет по умолчанию.

Все значения проходят проверку перед печатью в <style>: цвета через
parseColor, длины и шрифты через allowlist-шаблоны, числа через
диапазон. Закрыть объявление и дописать свой селектор нельзя.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Задача 6: Пресеты тем

**Файлы:**
- Создать: `src/core/theme/presets.ts`
- Тест: `tests/unit/theme/presets.test.ts`

**Интерфейсы:**
- Потребляет из задачи 5: тип `ThemeTokens`, функции `resolveTheme`, `buildThemeCss`, `themeCssVarName`, константа `COLOR_KEYS` из `@/core/theme/tokens`.
- Потребляет из задачи 4: `contrastRatio`, `flatten`, `parseColor`, `relativeLuminance`, тип `Rgba` из `@/core/theme/color`.
- Потребляет из задачи 3: файл `src/styles/tokens.css` (тест читает его слой 2 с диска).
- Производит:

```ts
export type PresetId =
  | 'neutral-dark' | 'deep-blue' | 'default-light' | 'midnight' | 'ocean'
  | 'minimal' | 'aurora' | 'glass' | 'high-contrast'
export interface ThemePreset { id: PresetId; tokens: ThemeTokens }
export const PRESETS: readonly ThemePreset[]          // девять, порядок из спеки
export const DEFAULT_PRESET_ID: PresetId              // 'neutral-dark'
export function findPreset(id: string): ThemePreset | null
```

Четыре решения, принятые здесь, чтобы их не пересматривали в задачах 9, 10 и 14.

**Пресет несёт только `id` и `tokens` — имени у него нет.** Отображаемое имя пресета — ключ локализации, который разрешается на уровне UI (спека, строка 347): `appearance.preset.neutral-dark`, а не строка «Neutral Dark» в объекте. Иначе имя пришлось бы дублировать на каждый язык внутри данных темы, а правило 43 это прямо запрещает. Токенов в пресете ровно столько, сколько нужно, чтобы отличаться от вывода: семь обязательных ключей задачи 5 плюс те, где вывод даёт не тот оттенок или недостаточный контраст. Остальные семнадцать значений добирает `resolveTheme`.

**Контраст измерен, а не заявлен.** Модель WCAG различает два вида фонов. Постоянные — `canvas`, `surface`, `glassBg`: текст на них читается всё время, порог для основного текста AAA (7:1). Транзитные — `surfaceHover`, `surfaceActive`: видны доли секунды при наведении и нажатии, порог AA (4.5:1) для основного текста и AA-Large (3:1) для приглушённого. `surfaceActive` — это фон нажатия, а не читаемого текста; требовать на нём 4.5:1 для третьего уровня текста значило бы схлопнуть трёхуровневую шкалу `fg → fgMuted → fgDim` в двухуровневую. Тест проверяет оба набора фонов по отдельности, с порогами по уровню текста, и печатает изменённую таблицу худших случаев ниже. Для High Contrast (правила 16 и 92) все пороги подняты до 7:1 на постоянных фонах и 4.5:1 на транзитных.

**Пресетов девять, а не восемь (ADR-005).** Спека выносит High Contrast в отдельный пресет, а не в вариант Glass, потому что это не косметика: правило 16 требует доступный режим с контрастом ко всем фонам не ниже 4.5:1, а правило 92 — соответствие WCAG. Склеить его с декоративным стеклом значило бы поставить доступность в зависимость от вкуса оформления. Deep Blue сохраняет синюю гамму исходного ТЗ (`#12232e` холст, `#0069ab` заливка) как именованный пресет, чтобы миграция задачи 10 могла молча перевести на него старую тему `default-dark`, не меняя пользователю картинку.

**Слой 2 файла `tokens.css` обязан совпадать с `buildThemeCss(neutral-dark)`.** У дефолта темы два представления: статический слой 2 из задачи 3, который виден до загрузки JS, и вывод `buildThemeCss` для пресета по умолчанию, который печатает `applyTheme` в задаче 9. Разойдись они — пользователь увидел бы мигание цвета при загрузке. Тест читает слой 2 с диска (по якорю-комментарию `--- Слой 2`, потому что в файле четыре блока `:root` подряд и первый — это слой 1) и сверяет каждое объявление с печатью через `parseColor`: `#0b0f17` в файле и `rgb(11 15 23)` из принтера — это один цвет, а тест сравнивает цвета, а не строки, поэтому `tokens.css` остаётся с человекочитаемым hex.

Изменённая таблица худшего контраста по каждому уровню текста (минимум по постоянным фонам / по транзитным). Все значения получены прогоном `contrastRatio`, а не подобраны на глаз:

```
                  fg·пост fg·тран mut·пост mut·тран dim·пост dim·тран primFg
  neutral-dark     17.19   12.88   7.01    5.26    4.56    3.42    5.21
  deep-blue        12.69    8.95   6.82    4.81    4.78    3.37    5.49
  default-light    13.18   13.72   5.48    5.70    5.14    5.35    5.64
  midnight         15.08   10.91   8.24    5.97    5.76    4.17    4.53
  ocean            13.82    9.88   9.74    6.97    5.99    4.28    6.79
  minimal          17.61   12.62   7.17    5.14    4.83    3.46   15.68
  aurora           10.59    7.68   7.32    5.31    5.40    3.92    5.97
  glass            12.44   11.56   8.38    7.78    5.09    4.73    7.63
  high-contrast    19.80   15.13  15.86   12.13   11.96    9.14   14.88
```

- [ ] **Шаг 1: Написать падающий тест**

Создать `tests/unit/theme/presets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio, flatten, parseColor, type Rgba } from '@/core/theme/color';
import { buildThemeCss, resolveTheme, COLOR_KEYS, type ResolvedTheme } from '@/core/theme/tokens';
import { DEFAULT_PRESET_ID, findPreset, PRESETS, type PresetId } from '@/core/theme/presets';

/** Все девять id в порядке, зафиксированном спекой (§«Палитра по умолчанию и пресеты»). */
const ORDER: PresetId[] = [
  'neutral-dark', 'deep-blue', 'default-light', 'midnight', 'ocean',
  'minimal', 'aurora', 'glass', 'high-contrast',
];

/** Разрешает пресет по id. null в тесте — это баг пресета, а не ветка данных. */
function resolvedById(id: PresetId): ResolvedTheme {
  const preset = findPreset(id);
  if (preset === null) throw new Error(`пресет ${id} не найден`);
  const theme = resolveTheme(preset.tokens);
  if (theme === null) throw new Error(`пресет ${id} не разрешился`);
  return theme;
}

/** Постоянные фоны: на них текст живёт всё время. glassBg сплющивается на canvas. */
function resting(theme: ResolvedTheme): Record<string, Rgba> {
  const c = theme.colors;
  return { canvas: c.canvas, surface: flatten(c.surface, c.canvas), glass: flatten(c.glassBg, c.canvas) };
}

/** Транзитные фоны: наведение и нажатие, видны доли секунды. */
function transient(theme: ResolvedTheme): Record<string, Rgba> {
  const c = theme.colors;
  return { hover: flatten(c.surfaceHover, c.canvas), active: flatten(c.surfaceActive, c.canvas) };
}

/** Минимальный контраст цвета по набору фонов. */
function minOver(color: Rgba, set: Record<string, Rgba>): number {
  return Math.min(...Object.values(set).map((bg) => contrastRatio(color, bg)));
}

const CSS = readFileSync(resolve(__dirname, '../../../src/styles/tokens.css'), 'utf8');

/**
 * Тело первого блока после якоря. Логика та же, что в задаче 3, но ошибку
 * бросает Error, а не expect: хелпер вызывается в модульной области, а expect
 * вне теста Vitest сообщает о провале невнятно.
 */
function block(header: string): string {
  const start = CSS.indexOf(header);
  if (start < 0) throw new Error(`блок «${header}» не найден`);
  const open = CSS.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1;
    if (CSS[i] === '}') {
      depth -= 1;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  throw new Error(`блок «${header}» не закрыт`);
}

/** Карта «--dashflow-имя → значение» из тела блока; переносы строк схлопнуты. */
function dashflowDeclarations(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of source.matchAll(/(--dashflow-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1], match[2].replace(/\s+/g, ' ').trim());
  }
  return map;
}

describe('PRESETS — состав и порядок', () => {
  it('содержит девять пресетов', () => {
    expect(PRESETS).toHaveLength(9);
  });

  it('id не повторяются', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('порядок совпадает со спекой', () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(ORDER);
  });

  it('пресет по умолчанию — neutral-dark', () => {
    expect(DEFAULT_PRESET_ID).toBe('neutral-dark');
  });

  it.each(ORDER)('%s несёт только id и tokens', (id) => {
    const preset = findPreset(id);
    expect(preset === null ? [] : Object.keys(preset).sort()).toEqual(['id', 'tokens']);
  });
});

describe('findPreset', () => {
  it.each(ORDER)('находит %s', (id) => {
    expect(findPreset(id)?.id).toBe(id);
  });

  it.each(['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'нет такого'])(
    'возвращает null на %s',
    (key) => {
      expect(findPreset(key)).toBeNull();
    },
  );
});

describe('resolveTheme — полнота', () => {
  it.each(ORDER)('%s разрешается в двадцать четыре цвета', (id) => {
    expect(Object.keys(resolvedById(id).colors)).toHaveLength(24);
  });
});

describe('контраст — постоянные и транзитные фоны', () => {
  /** Порог приглушённого и тусклого текста: доступный режим держит AAA. */
  const tierNeed = (id: PresetId): number => (id === 'high-contrast' ? 7 : 4.5);

  it.each(ORDER)('%s: основной текст на постоянных фонах ≥ 7:1', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fg, resting(theme))).toBeGreaterThanOrEqual(7);
  });

  it.each(ORDER)('%s: основной текст на транзитных фонах ≥ 4.5:1', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fg, transient(theme))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(ORDER)('%s: приглушённый текст на постоянных фонах в норме уровня', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fgMuted, resting(theme))).toBeGreaterThanOrEqual(tierNeed(id));
  });

  it.each(ORDER)('%s: приглушённый текст на транзитных фонах ≥ 3:1', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fgMuted, transient(theme))).toBeGreaterThanOrEqual(3);
  });

  it.each(ORDER)('%s: тусклый текст на постоянных фонах в норме уровня', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fgDim, resting(theme))).toBeGreaterThanOrEqual(tierNeed(id));
  });

  it.each(ORDER)('%s: тусклый текст на транзитных фонах ≥ 3:1', (id) => {
    const theme = resolvedById(id);
    expect(minOver(theme.colors.fgDim, transient(theme))).toBeGreaterThanOrEqual(3);
  });

  it.each(ORDER)('%s: текст на заливке primary в норме уровня', (id) => {
    const theme = resolvedById(id);
    expect(contrastRatio(theme.colors.primaryFg, theme.colors.primary)).toBeGreaterThanOrEqual(tierNeed(id));
  });
});

describe('иерархия текста', () => {
  it.each(ORDER)('%s: контраст к холсту падает от fg к fgMuted и к fgDim', (id) => {
    const c = resolvedById(id).colors;
    // Мерить контрастом к холсту, а не яркостью: в светлой теме fg темнее
    // холста и порядок яркости переворачивается. Контраст монотонен всегда.
    const toCanvas = (color: Rgba): number => contrastRatio(color, c.canvas);
    expect(toCanvas(c.fg)).toBeGreaterThan(toCanvas(c.fgMuted));
    expect(toCanvas(c.fgMuted)).toBeGreaterThan(toCanvas(c.fgDim));
  });
});

describe('High Contrast', () => {
  it('задаёт чёрный текст на жёлтой заливке явно', () => {
    expect(findPreset('high-contrast')?.tokens.primaryFg).toBe('#000000');
  });

  it('выключает стекло: размытие 0px, прозрачность 0.9', () => {
    const theme = resolvedById('high-contrast');
    expect(theme.glassBlur).toBe('0px');
    expect(theme.glassOpacity).toBe(0.9);
  });

  it('держит контраст текста ко всем фонам не ниже 4.5:1 (правило 16)', () => {
    const theme = resolvedById('high-contrast');
    const all = { ...resting(theme), ...transient(theme) };
    for (const tier of [theme.colors.fg, theme.colors.fgMuted, theme.colors.fgDim]) {
      expect(minOver(tier, all)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('tokens.css совпадает с пресетом по умолчанию', () => {
  const layerTwo = block('--- Слой 2');
  const authored = dashflowDeclarations(layerTwo);
  const printed = dashflowDeclarations(buildThemeCss(resolvedById(DEFAULT_PRESET_ID)));

  it('слой 2 объявляет все двадцать четыре цвета плюс десять скаляров', () => {
    expect(authored.size).toBe(COLOR_KEYS.length + 10);
  });

  it('имена в слое 2 совпадают с печатью neutral-dark', () => {
    expect([...authored.keys()].sort()).toEqual([...printed.keys()].sort());
  });

  it('каждое значение слоя 2 равно печати neutral-dark', () => {
    for (const [name, expected] of printed) {
      const actual = authored.get(name);
      const printedColor = parseColor(expected);
      const authoredColor = actual === undefined ? null : parseColor(actual);
      if (printedColor !== null && authoredColor !== null) {
        expect(authoredColor, name).toEqual(printedColor);
      } else {
        expect(actual, name).toBe(expected);
      }
    }
  });
});
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Запустить: `npx vitest run tests/unit/theme/presets.test.ts`

Ожидается: FAIL с `Failed to resolve import "@/core/theme/presets"`.

- [ ] **Шаг 3: Написать реализацию**

Создать `src/core/theme/presets.ts`:

```ts
import type { ThemeTokens } from '@/core/theme/tokens';

/**
 * Девять пресетов темы. Каждый задаёт минимум авторских токенов; полную тему
 * из 24 цветов собирает resolveTheme (см. tokens.ts). Список и порядок
 * зафиксированы спекой §«Палитра по умолчанию и пресеты» и проверяются тестом.
 *
 * Контраст измерен, а не заявлен. Модель WCAG различает два вида фонов:
 *   постоянные — canvas, surface, glass: текст на них читается всё время;
 *   транзитные — hover, active: видны доли секунды при взаимодействии.
 * Пороги: fg ≥ 7 (AAA) на постоянных и ≥ 4.5 (AA) на транзитных; fgMuted и
 * fgDim ≥ 4.5 (AA) на постоянных и ≥ 3 (AA-Large) на транзитных; primaryFg на
 * primary ≥ 4.5. High Contrast держит ≥ 4.5 ко всем фонам (спека §14.6).
 * surfaceActive — фон нажатия, а не читаемого текста; требовать на нём 4.5:1
 * для третьего уровня текста значило бы схлопнуть трёхуровневую шкалу в две.
 *
 * Худший контраст по каждому уровню (постоянные / транзитные фоны):
 *                   fg·пост fg·тран mut·пост mut·тран dim·пост dim·тран primFg
 *   neutral-dark     17.19   12.88   7.01    5.26    4.56    3.42    5.21
 *   deep-blue        12.69    8.95   6.82    4.81    4.78    3.37    5.49
 *   default-light    13.18   13.72   5.48    5.70    5.14    5.35    5.64
 *   midnight         15.08   10.91   8.24    5.97    5.76    4.17    4.53
 *   ocean            13.82    9.88   9.74    6.97    5.99    4.28    6.79
 *   minimal          17.61   12.62   7.17    5.14    4.83    3.46   15.68
 *   aurora           10.59    7.68   7.32    5.31    5.40    3.92    5.97
 *   glass            12.44   11.56   8.38    7.78    5.09    4.73    7.63
 *   high-contrast    19.80   15.13  15.86   12.13   11.96    9.14   14.88
 */
export type PresetId =
  | 'neutral-dark'
  | 'deep-blue'
  | 'default-light'
  | 'midnight'
  | 'ocean'
  | 'minimal'
  | 'aurora'
  | 'glass'
  | 'high-contrast';

export interface ThemePreset {
  id: PresetId;
  tokens: ThemeTokens;
}

export const DEFAULT_PRESET_ID: PresetId = 'neutral-dark';

export const PRESETS: readonly ThemePreset[] = [
  {
    id: 'neutral-dark',
    tokens: {
      canvas: '#0b0f17',
      surface: 'rgb(18 26 38 / 0.7)',
      surfaceHover: 'rgb(28 39 56 / 0.85)',
      surfaceActive: 'rgb(35 49 70 / 0.95)',
      primary: '#3b82f6',
      primaryHover: '#60a5fa',
      secondary: '#06b6d4',
      accent: '#8b5cf6',
      fg: '#f8fafc',
      fgMuted: '#94a3b8',
      fgDim: '#748196',
      line: 'rgb(255 255 255 / 0.08)',
      lineHover: 'rgb(255 255 255 / 0.22)',
    },
  },
  {
    id: 'deep-blue',
    tokens: {
      canvas: '#12232e',
      surface: 'rgb(32 54 71 / 0.72)',
      primary: '#0069ab',
      primaryHover: '#0072b8',
      secondary: '#4da8da',
      accent: '#00e0c6',
      fg: '#eefbfb',
      fgMuted: '#9bbecf',
      fgDim: '#7d9fb1',
      line: 'rgb(155 190 207 / 0.2)',
    },
  },
  {
    id: 'default-light',
    tokens: {
      canvas: '#f5fafd',
      surface: 'rgb(255 255 255 / 0.82)',
      primary: '#0369a1',
      secondary: '#0e7490',
      accent: '#7c3aed',
      fg: '#12303d',
      fgMuted: '#4b6a7b',
      fgDim: '#526e7d',
      line: 'rgb(26 58 74 / 0.16)',
    },
  },
  {
    id: 'midnight',
    tokens: {
      canvas: '#0f0c20',
      surface: 'rgb(27 23 53 / 0.72)',
      primary: '#8b5cf6',
      secondary: '#c084fc',
      accent: '#f0abfc',
      fg: '#f3e8ff',
      fgMuted: '#b9a4f8',
      fgDim: '#9b86d8',
      line: 'rgb(139 92 246 / 0.25)',
    },
  },
  {
    id: 'ocean',
    tokens: {
      canvas: '#062026',
      surface: 'rgb(11 51 60 / 0.72)',
      primary: '#14b8a6',
      secondary: '#2dd4bf',
      accent: '#38bdf8',
      fg: '#f0fdfa',
      fgMuted: '#5eead4',
      fgDim: '#4bb8a8',
      line: 'rgb(20 184 166 / 0.25)',
    },
  },
  {
    id: 'minimal',
    tokens: {
      canvas: '#09090b',
      surface: 'rgb(24 24 27 / 0.75)',
      primary: '#e4e4e7',
      secondary: '#a1a1aa',
      accent: '#d4d4d8',
      fg: '#fafafa',
      fgMuted: '#a1a1aa',
      fgDim: '#82828c',
      line: 'rgb(255 255 255 / 0.15)',
    },
  },
  {
    id: 'aurora',
    tokens: {
      canvas: '#022c22',
      surface: 'rgb(6 78 59 / 0.72)',
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#a7f3d0',
      fg: '#ecfdf5',
      fgMuted: '#6ee7b7',
      fgDim: '#63c79b',
      line: 'rgb(16 185 129 / 0.25)',
    },
  },
  {
    id: 'glass',
    tokens: {
      canvas: '#0b0d14',
      surface: 'rgb(255 255 255 / 0.07)',
      surfaceHover: 'rgb(255 255 255 / 0.12)',
      surfaceActive: 'rgb(255 255 255 / 0.18)',
      primary: '#60a5fa',
      secondary: '#a78bfa',
      accent: '#f472b6',
      fg: '#ffffff',
      fgMuted: '#cbd5e1',
      fgDim: '#9aa7b8',
      line: 'rgb(255 255 255 / 0.14)',
      glassOpacity: 0.16,
      glassBlur: '32px',
    },
  },
  {
    id: 'high-contrast',
    tokens: {
      canvas: '#000000',
      surface: '#0a0a0a',
      surfaceHover: '#1a1a1a',
      surfaceActive: '#262626',
      primary: '#ffd60a',
      primaryHover: '#ffe45c',
      primaryFg: '#000000',
      secondary: '#00e5ff',
      accent: '#ff7ab6',
      fg: '#ffffff',
      fgMuted: '#e6e6e6',
      fgDim: '#c9c9c9',
      line: 'rgb(255 255 255 / 0.6)',
      lineHover: '#ffffff',
      glassOpacity: 0.9,
      glassBlur: '0px',
    },
  },
];

/** Находит пресет по id. Возвращает null на неизвестном и на ключах прототипа. */
export function findPreset(id: string): ThemePreset | null {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Запустить: `npx vitest run tests/unit/theme/presets.test.ts`

Ожидается: PASS, 115 проверок в 7 блоках `describe`. Из них 63 — контрастные: девять пресетов на семь уровней текста; их эмпирические значения записаны в таблице шапки `presets.ts`.

Если падает контрастная проверка — искать причину в токенах пресета, а не в пороге. Пороги отражают правила 16 и 92 и модель постоянных/транзитных фонов; ослаблять их, чтобы «прошло», запрещено. Если падает `каждое значение слоя 2 равно печати neutral-dark` — значит слой 2 в `tokens.css` (задача 3) и вывод `buildThemeCss` для `neutral-dark` разошлись: сверить объявление, которое тест назвал, и привести `tokens.css` к печати, а не наоборот.

- [ ] **Шаг 5: Проверить типы и линтер**

Запустить: `npx tsc --noEmit`

Ожидается: без ошибок.

Запустить: `npm run lint`

Ожидается: без ошибок.

- [ ] **Шаг 6: Коммит**

```bash
git add src/core/theme/presets.ts tests/unit/theme/presets.test.ts
git commit -m "$(cat <<'EOF'
feat(theme): девять пресетов тем с измеренным контрастом

Каждый пресет задаёт минимум авторских токенов; полную тему из 24
цветов собирает resolveTheme. Имя пресета — ключ локализации на уровне
UI, поэтому объект несёт только id и tokens.

Контраст всех девяти пресетов измерен contrastRatio по модели
постоянных и транзитных фонов: основной текст AAA на постоянных и AA
на транзитных, приглушённый — AA и AA-Large. High Contrast держит 4.5:1
ко всем фонам (правила 16 и 92). Тест сверяет слой 2 tokens.css с
печатью пресета по умолчанию, чтобы дефолт не мигал при загрузке.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Задача 7: Валидатор пользовательского CSS

**Файлы:**
- Создать: `src/core/theme/cssValidator.ts`
- Тест: `tests/unit/theme/cssValidator.test.ts`

**Интерфейсы:**
- Потребляет: ничего. Валидатор — чистая текстовая функция без зависимостей от других модулей темы.
- Производит:

```ts
export const MAX_CSS_LENGTH = 50_000
export type CssRejectionCode =
  | 'invalid-type' | 'too-large' | 'import-forbidden'
  | 'legacy-property' | 'external-url' | 'malformed-url' | 'parse-error'
export interface CssAccepted { ok: true; css: string }
export interface CssRejected { ok: false; code: CssRejectionCode; message: string; detail?: string }
export type CssValidationResult = CssAccepted | CssRejected
export interface ValidateCssOptions { allowExternal?: boolean }
export function validateCustomCss(input: unknown, options?: ValidateCssOptions): CssValidationResult
```

Здесь только чистая функция и её тест. Подключение к `CssEditorModal` и снятие ложного утверждения из `SECURITY_ARCHITECTURE.md` §2.1 — задача 14: пока валидатор не встроен в поток, документацию нельзя объявлять правдой.

**Угроза — сетевая утечка, а не исполнение кода.** CSS не исполняет JavaScript, поэтому XSS через таблицу стилей невозможен. Реальная угроза, названная в спеке («Валидация пользовательского CSS»): `@import`, `url()` и `src` в `@font-face` с внешней схемой заставляют браузер сходить на чужой сервер, и владелец URL узнаёт IP пользователя и время открытия новой вкладки. Поэтому валидатор ловит именно сетевые схемы, а не «опасные символы».

**Основная защита текстовая, нативный парсер — второй слой.** Спека называет разбор через конструируемый `CSSStyleSheet` первым шагом, но у проекта Vitest гоняется в Node, где `CSSStyleSheet` нет вовсе, и, что важнее, `replaceSync` молча выбрасывает `@import` и не отвергает внешние `url()` — то есть именно те два вектора, ради которых валидатор существует, парсер пропускает. Значит основой быть он не может. Основа — детерминированный текстовый анализ, работающий одинаково в тесте и в браузере; `CSSStyleSheet` идёт вторым слоем под `typeof CSSStyleSheet !== 'undefined'` и отсекает только синтаксический мусор в проде. Тесты покрывают текстовый слой полностью; браузерную ветку — нет, и это осознанно зафиксировано здесь.

**Принять или отклонить целиком, называя правило.** Молчаливое вырезание запрещено (спека, риск «CSS-инъекция»; правило 112: пользователь должен понимать, на что соглашается). Половинчатый CSS хуже пустого: пропавший кусок выглядит как баг движка. Результат — размеченное объединение: `code` — стабильный ключ локализации сообщения на уровне UI, `message` — запасной текст для разработчика, `detail` — уточнение (схема `url()` или имя свойства). Сброс CSS из настроек доступен всегда, чтобы неудачное правило нельзя было превратить в кирпич.

**Тумблер добавляет только `https` к `url()`.** Осознанный тумблер `allowExternal` (ADR-007) разрешает точечные `https`-ресурсы — фон, шрифт. Он не открывает `http` (открытый канал утекает даже при перехвате), `@import` (тянет чужую таблицу стилей целиком, рекурсивно) и legacy-свойства `behavior`/`-moz-binding` (в старых IE/Firefox они исполняли код через HTC/XBL — это исполнение, а не ресурс, запрещено безусловно). Порядок проверок: размер → `@import` → legacy → `url()` → нативный парсер.

**Известное ограничение — `url()` внутри строкового литерала.** `@import` и legacy ищутся по тексту с вырезанными строками, поэтому `content:"@import"` и `.import-note{}` проходят. А `url()` ищется по тексту со строками, потому что `url("data:…")` сам держит значение в кавычках — вырезав строки, мы превратили бы его в `url("")` и потеряли схему. Плата: `content:"url(https://…)"` отклоняется как внешний ресурс, хотя это просто текст. Это ложное отклонение, а не ложный приём — безопасная сторона ошибки. Число совпадений `url(...)` сверяется с числом подстрок `url(`; расхождение (незакрытая или вложенная скобка) отвергается кодом `malformed-url`, а не пропускается.

Коды отклонения и когда возникают:

```
  invalid-type      вход не строка
  too-large         длина больше MAX_CSS_LENGTH
  import-forbidden   @import в любом виде (строка, url(), любой регистр)
  legacy-property    behavior, -moz-binding, -ms-behavior
  external-url       url() со схемой кроме data:/chrome-extension: (и https: при тумблере)
  malformed-url      число url(...) не совпало с числом «url(»
  parse-error        нативный CSSStyleSheet не разобрал (только в браузере)
```

- [ ] **Шаг 1: Написать падающий тест**

Создать `tests/unit/theme/cssValidator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_CSS_LENGTH, validateCustomCss, type CssRejectionCode } from '@/core/theme/cssValidator';

/** Безопасный CSS, который валидатор принимает без тумблера. */
const ACCEPT: Array<{ label: string; css: string }> = [
  { label: 'пустая строка', css: '' },
  { label: 'только пробелы', css: '   \n  ' },
  { label: 'обычное правило', css: '.widget { color: red; }' },
  { label: 'несколько правил', css: 'body{margin:0}\n.a{padding:4px}' },
  { label: 'медиазапрос', css: '@media (min-width: 600px) { .a { color: blue } }' },
  { label: 'data: без кавычек', css: '.a{background:url(data:image/png;base64,iVBORw0KGgo=)}' },
  { label: 'data: в двойных кавычках', css: '.a{background:url("data:image/png;base64,iVBORw0KGgo=")}' },
  { label: 'data: в одинарных кавычках', css: ".a{background:url('data:image/png;base64,iVBORw0KGgo=')}" },
  { label: 'chrome-extension:', css: '.a{background:url(chrome-extension://abc/img.png)}' },
  { label: 'CHROME-EXTENSION в верхнем регистре', css: '.a{background:url(CHROME-EXTENSION://abc/i.png)}' },
  { label: 'data: с запятыми и пробелом', css: '.a{ background: url( "data:image/svg+xml,%3Csvg%20/%3E" ) }' },
  { label: 'два разрешённых url', css: '.a{background:url(data:,x)}.b{background:url(chrome-extension://i/y.png)}' },
  { label: '@import внутри комментария', css: '/* @import url(https://evil.test/x.css); */ .a{color:red}' },
  { label: 'внешний url внутри комментария', css: '/* url(https://evil.test/p.png) */ .a{color:red}' },
  { label: 'слово behavior в имени класса', css: '.behavior-hint{color:red}' },
  { label: 'слово import в имени класса', css: '.import-note{color:red}' },
  { label: '@import в строковом литерале', css: '.a::after{content:"@import"}' },
  { label: '!important не путается с @import', css: '.a{color:red !important}' },
  { label: 'ровно предельная длина', css: `.a{content:"${'x'.repeat(MAX_CSS_LENGTH - 14)}"}` },
  { label: 'шрифт с data: в src', css: "@font-face{font-family:X;src:url('data:font/woff2;base64,AA')}" },
];

/** Отклоняемый без тумблера. css — unknown: один кейс не строка. */
const REJECT: Array<{ label: string; css: unknown; code: CssRejectionCode }> = [
  { label: 'не строка', css: 42, code: 'invalid-type' },
  { label: 'длиннее предела', css: 'a'.repeat(MAX_CSS_LENGTH + 1), code: 'too-large' },
  { label: '@import со строкой', css: '@import "https://evil.test/x.css";', code: 'import-forbidden' },
  { label: '@import с url()', css: '@import url(https://evil.test/x.css);', code: 'import-forbidden' },
  { label: '@IMPORT в верхнем регистре', css: '@IMPORT "x.css";', code: 'import-forbidden' },
  { label: '@import с переводом строки', css: '@import\n  url(data:,x);', code: 'import-forbidden' },
  { label: 'http://', css: '.a{background:url(http://evil.test/p.png)}', code: 'external-url' },
  { label: 'https:// без тумблера', css: '.a{background:url(https://evil.test/p.png)}', code: 'external-url' },
  { label: 'протокол-относительный', css: '.a{background:url(//evil.test/p.png)}', code: 'external-url' },
  { label: 'относительный путь', css: '.a{background:url(bg.png)}', code: 'external-url' },
  { label: 'blob:', css: '.a{background:url(blob:abc)}', code: 'external-url' },
  { label: 'javascript:', css: '.a{background:url(javascript:alert(1))}', code: 'external-url' },
  { label: 'file:', css: '.a{background:url(file:///etc/passwd)}', code: 'external-url' },
  { label: 'пустой url()', css: '.a{background:url()}', code: 'external-url' },
  { label: 'внешний url во втором правиле', css: '.a{background:url(data:,x)}.b{background:url(https://e.test/y)}', code: 'external-url' },
  { label: 'внешний src в @font-face', css: "@font-face{font-family:X;src:url('https://evil.test/f.woff2')}", code: 'external-url' },
  { label: 'url() внутри content-строки', css: '.a::after{content:"url(https://e.test/p)"}', code: 'external-url' },
  { label: 'behavior', css: '.a{behavior:url(x.htc)}', code: 'legacy-property' },
  { label: 'BEHAVIOR в верхнем регистре', css: '.a{BEHAVIOR:url(x.htc)}', code: 'legacy-property' },
  { label: '-moz-binding', css: '.a{-moz-binding:url(x.xml)}', code: 'legacy-property' },
  { label: '-ms-behavior', css: '.a{-ms-behavior:url(x.htc)}', code: 'legacy-property' },
  { label: 'behavior с пробелом до двоеточия', css: '.a{ behavior : url(x.htc) }', code: 'legacy-property' },
  { label: 'незакрытый url(', css: '.a{background:url(data:,x', code: 'malformed-url' },
  { label: 'url( без закрытия в середине', css: '.a{background:url(data:,x}\n.b{color:red}', code: 'malformed-url' },
  { label: 'вложенный url(url())', css: '.a{background:url(url(data:,x))}', code: 'malformed-url' },
];

/** С тумблером allowExternal принимаются. */
const ACCEPT_EXTERNAL: Array<{ label: string; css: string }> = [
  { label: 'https:// с тумблером', css: '.a{background:url(https://cdn.test/p.png)}' },
  { label: 'data: с тумблером', css: '.a{background:url(data:,x)}' },
];

/** С тумблером всё равно отклоняются. */
const REJECT_EXTERNAL: Array<{ label: string; css: string; code: CssRejectionCode }> = [
  { label: 'http:// даже с тумблером', css: '.a{background:url(http://cdn.test/p.png)}', code: 'external-url' },
  { label: '@import даже с тумблером', css: '@import url(https://cdn.test/x.css);', code: 'import-forbidden' },
  { label: 'относительный даже с тумблером', css: '.a{background:url(bg.png)}', code: 'external-url' },
  { label: 'behavior даже с тумблером', css: '.a{behavior:url(x.htc)}', code: 'legacy-property' },
];

/** detail несёт схему url() или имя свойства. */
const DETAIL: Array<{ label: string; css: string; detail: string }> = [
  { label: 'схема https', css: '.a{background:url(https://e.test/p)}', detail: 'https' },
  { label: 'схема relative', css: '.a{background:url(p.png)}', detail: 'relative' },
  { label: 'схема protocol-relative', css: '.a{background:url(//e.test/p)}', detail: 'protocol-relative' },
  { label: 'свойство behavior', css: '.a{behavior:url(x)}', detail: 'behavior' },
  { label: 'свойство -moz-binding', css: '.a{-moz-binding:url(x)}', detail: '-moz-binding' },
];

describe('validateCustomCss — принимает безопасный CSS', () => {
  it.each(ACCEPT)('принимает: $label', ({ css }) => {
    const result = validateCustomCss(css);
    expect(result.ok).toBe(true);
    // Байт-в-байт: ничего не вырезано молча.
    if (result.ok) expect(result.css).toBe(css);
  });
});

describe('validateCustomCss — отклоняет сетевые утечки и мусор', () => {
  it.each(REJECT)('отклоняет: $label', ({ css, code }) => {
    const result = validateCustomCss(css);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
  });
});

describe('validateCustomCss — тумблер внешних ресурсов', () => {
  it.each(ACCEPT_EXTERNAL)('с allowExternal принимает: $label', ({ css }) => {
    expect(validateCustomCss(css, { allowExternal: true }).ok).toBe(true);
  });

  it.each(REJECT_EXTERNAL)('с allowExternal всё равно отклоняет: $label', ({ css, code }) => {
    const result = validateCustomCss(css, { allowExternal: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
  });
});

describe('validateCustomCss — detail уточняет причину', () => {
  it.each(DETAIL)('$label', ({ css, detail }) => {
    const result = validateCustomCss(css);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toBe(detail);
  });
});
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Запустить: `npx vitest run tests/unit/theme/cssValidator.test.ts`

Ожидается: FAIL с «Failed to resolve import "@/core/theme/cssValidator"» — модуля ещё нет.

- [ ] **Шаг 3: Написать реализацию**

Создать `src/core/theme/cssValidator.ts`:

```ts
/**
 * Валидатор пользовательского CSS. CSS не исполняет JS, поэтому единственная
 * реальная угроза — сетевая утечка: @import, url() и src в @font-face с внешней
 * схемой заставляют браузер сходить на чужой сервер, и владелец URL узнаёт IP
 * пользователя и время открытия новой вкладки (спека, «Валидация
 * пользовательского CSS»). Защита текстовая и детерминированная: она работает
 * и в Node-тестах, и в браузере. Конструируемый CSSStyleSheet — второй слой под
 * feature-detect: он есть только в браузере и, что важнее, молча выбрасывает
 * @import и не отвергает внешние url(), поэтому основой защиты быть не может.
 */

/** Предел размера. Правило «CSS ограничен по размеру» из спеки. */
export const MAX_CSS_LENGTH = 50_000;

/** Код отклонения — стабильный ключ локализации сообщения на уровне UI. */
export type CssRejectionCode =
  | 'invalid-type'
  | 'too-large'
  | 'import-forbidden'
  | 'legacy-property'
  | 'external-url'
  | 'malformed-url'
  | 'parse-error';

export interface CssAccepted {
  ok: true;
  /** Возвращается байт-в-байт: валидатор ничего не вырезает молча. */
  css: string;
}

export interface CssRejected {
  ok: false;
  code: CssRejectionCode;
  /** Запасной текст для разработчика; пользователю показывается перевод code. */
  message: string;
  /** Уточнение: схема url() или имя свойства. */
  detail?: string;
}

export type CssValidationResult = CssAccepted | CssRejected;

export interface ValidateCssOptions {
  /** Осознанный тумблер внешних ресурсов: добавляет схему https в url() (ADR-007). */
  allowExternal?: boolean;
}

/** Схемы, разрешённые в url() всегда. https добавляет тумблер allowExternal. */
const ALWAYS_ALLOWED: ReadonlySet<string> = new Set(['data', 'chrome-extension']);

/** Убирает блочные комментарии: они не исполняются, но прячут @import и url(). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** Заменяет строковые литералы пустыми кавычками, сохраняя экранирование. */
function stripStrings(source: string): string {
  return source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
}

/** Извлекает схему значения url(): data, chrome-extension, https, relative … */
function urlScheme(raw: string): string {
  const value = raw.trim();
  if (value === '') return 'empty';
  if (/^data:/i.test(value)) return 'data';
  if (/^chrome-extension:/i.test(value)) return 'chrome-extension';
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (match) return match[1].toLowerCase();
  if (value.startsWith('//')) return 'protocol-relative';
  return 'relative';
}

function reject(code: CssRejectionCode, message: string, detail?: string): CssRejected {
  return detail === undefined ? { ok: false, code, message } : { ok: false, code, message, detail };
}

/**
 * Проверяет CSS и принимает или отклоняет его целиком, называя нарушенное
 * правило. Молчаливое вырезание запрещено: половинчатый CSS хуже пустого, а
 * пользователь должен понимать, что отклонено (спека, риск «CSS-инъекция»;
 * правило 112). Сброс CSS из настроек доступен всегда.
 */
export function validateCustomCss(input: unknown, options: ValidateCssOptions = {}): CssValidationResult {
  const allowExternal = options.allowExternal === true;

  if (typeof input !== 'string') {
    return reject('invalid-type', 'CSS должен быть строкой.');
  }
  if (input.length > MAX_CSS_LENGTH) {
    return reject('too-large', `CSS длиннее ${MAX_CSS_LENGTH} символов.`, String(input.length));
  }

  const withoutComments = stripComments(input);
  const withoutStrings = stripStrings(withoutComments);

  if (/@import\b/i.test(withoutStrings)) {
    return reject('import-forbidden', 'Правило @import запрещено: оно загружает внешний ресурс.');
  }

  const legacy = /(?:^|[\s;{])(-moz-binding|-ms-behavior|behavior)\s*:/i.exec(withoutStrings);
  if (legacy !== null) {
    return reject('legacy-property', `Свойство ${legacy[1]} запрещено.`, legacy[1].toLowerCase());
  }

  // Число совпадений url(...) сверяется с числом «url(»: расхождение означает
  // незакрытую или вложенную скобку, которую нельзя разобрать надёжно.
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
  const matches = [...withoutComments.matchAll(urlPattern)];
  const openings = withoutComments.match(/url\(/gi);
  if (matches.length !== (openings === null ? 0 : openings.length)) {
    return reject('malformed-url', 'Значение url() не разобрано: проверьте скобки и кавычки.');
  }
  for (const match of matches) {
    const raw = match[1] ?? match[2] ?? match[3] ?? '';
    const scheme = urlScheme(raw);
    const allowed = ALWAYS_ALLOWED.has(scheme) || (allowExternal && scheme === 'https');
    if (!allowed) {
      return reject('external-url', `Схема url() «${scheme}» запрещена.`, scheme);
    }
  }

  // Второй слой: нативный парсер отсекает синтаксический мусор. Только в браузере
  // (в Node нет CSSStyleSheet), поэтому под feature-detect и не как основа защиты.
  if (typeof CSSStyleSheet !== 'undefined') {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(withoutComments);
    } catch (error) {
      return reject('parse-error', 'CSS не разобран браузером.', String(error));
    }
  }

  return { ok: true, css: input };
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Запустить: `npx vitest run tests/unit/theme/cssValidator.test.ts`

Ожидается: PASS, 56 проверок в 4 блоках `describe` (20 приёмов + 25 отклонений + 6 тумблер + 5 detail). Числа выверены прогоном логики валидатора в Node до записи в план.

Если падает приём `data:`- или `chrome-extension:`-кейса — сравнить со списком `ALWAYS_ALLOWED`, не ослаблять проверку схемы. Если падает `url() внутри content-строки` (ждём отклонение, получили приём) — значит `url()` ошибочно ищется по тексту с вырезанными строками; это ложный приём внешнего ресурса, чинить в реализации, а не в тесте.

- [ ] **Шаг 5: Проверить типы и линтер**

Запустить: `npx tsc --noEmit`

Ожидается: без ошибок.

Запустить: `npm run lint`

Ожидается: без ошибок.

- [ ] **Шаг 6: Коммит**

```bash
git add src/core/theme/cssValidator.ts tests/unit/theme/cssValidator.test.ts
git commit -m "$(cat <<'EOF'
feat(theme): валидатор пользовательского CSS против сетевой утечки

CSS не исполняет JS, поэтому валидатор ловит не «опасные символы», а
сетевые схемы: @import, url() и src в @font-face с внешней схемой
раскрывают IP и время открытия вкладки владельцу URL. Защита текстовая
и детерминированная — работает в Node-тестах и в браузере; нативный
CSSStyleSheet идёт вторым слоем под feature-detect.

Принимает или отклоняет целиком с кодом-ключом локализации: молчаливое
вырезание запрещено (правило 112). Тумблер allowExternal добавляет
только https; @import и legacy behavior/-moz-binding запрещены всегда.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

<!-- ЗАДАЧИ -->

