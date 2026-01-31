# DashFlow Theme System

CSS variable-based theming with light/dark modes and custom overrides.

---

## 1. CSS Variable Schema

```css
:root {
  --color-bg: var(--theme-bg);
  --color-bg-elevated: var(--theme-bg-elevated);
  --color-surface: var(--theme-surface);
  --color-surface-hover: var(--theme-surface-hover);
  --color-text: var(--theme-text);
  --color-text-muted: var(--theme-text-muted);
  --color-border: var(--theme-border);
  --color-primary: var(--theme-primary);
  --color-primary-hover: var(--theme-primary-hover);
}
```

`--theme-*` are set per `[data-theme="light"]` / `[data-theme="dark"]`.

---

## 2. Theme Switcher Logic

**`src/lib/theme.ts`**

- `applyTheme(mode, overrides?)` — sets `data-theme` on `<html>`, applies overrides
- `initTheme()` — subscribes to settings, listens for `prefers-color-scheme`
- Resolves `system` → `light` or `dark` from `matchMedia('(prefers-color-scheme: dark)')`

**Flow:**
1. User picks Light / Dark / System in ThemeSwitcher
2. `setTheme()` updates settings store
3. Persistence saves to chrome.storage
4. `applyTheme()` runs, sets `data-theme` and optional overrides

---

## 3. Example Theme Definitions

**Light:**
- bg: slate-50, surface: slate-100, text: slate-900, primary: blue-500

**Dark:**
- bg: slate-950, surface: slate-800, text: slate-50, primary: blue-400

**Custom overrides** (via `ThemeOverrides`):
- `primary`, `background`, `surface`, `text`, `textMuted`, `border`
- Applied as inline styles on `:root` when set

---

## 4. Tailwind Compatibility

Use arbitrary values:
```html
<div className="bg-[var(--color-bg)] text-[var(--color-text)]" />
```

Or extend `tailwind.config`:
```js
theme: {
  extend: {
    colors: {
      dash: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        // ...
      }
    }
  }
}
```

---

## 5. Persistence

Theme preference is stored in `settings.theme` and `settings.themeOverrides`, persisted to `chrome.storage.local` with the rest of settings.
