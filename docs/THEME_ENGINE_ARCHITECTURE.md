# Архитектура Тем и Кастомизации (Theme Engine Architecture)

## 1. Концепция Theme Engine

**Theme Engine** обеспечивает кастомизацию внешнего вида DashFlow через токенизированные CSS-переменные (`CSS Variables`) без необходимости пересборки кода.

```text
┌─────────────────────────────────────────────────────────────┐
│                       Theme Engine                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Presets (Default Dark, Default Light, Ocean, Glass...)│  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│         ┌────────────────────┼────────────────────┐         │
│         ▼                    ▼                    ▼         │
│  Custom Theme Builder   Background System    Custom CSS Editor
│  (Цвета, Скругления,   (Unsplash, Градиенты, (Безопасный    │
│   Прозрачность)         Изображения)         Инжектор)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Import / Export Engine                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ JSON Configuration Schema (Full, Theme-Only, Layout)  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Структура Темантических Токенов (`ThemeSchema`)

Каждая тема описывается следующим контрактом:

```typescript
export interface ThemeTokens {
  id: string;
  name: string;
  colors: {
    bg: string;
    surface: string;
    surfaceHover: string;
    primary: string;
    secondary: string;
    text: string;
    textMuted: string;
    border: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  glass: {
    bg: string;
    blur: string;
  };
}
```

---

## 3. Готовые Пресеты и Фон

- **Default Dark:** Исходная темно-синяя гамма ТЗ (`#12232E` / `#203647` / `#007CC7` / `#4DA8DA`).
- **Default Light:** Исходная светлая гамма ТЗ (`#F5FAFD` / `#FFFFFF` / `#007CC7` / `#9BBECF`).
- **Midnight, Ocean, Minimal, Glass, Aurora, High Contrast:** Кастомные пресеты стилей.
- **Менеджер фонов:** Поддержка сплошных цветов, градиентов, Unsplash фото-обоев и пользовательских URL.

---

## 4. Конфигурация Импорта/Экспорта (JSON)

Формат экспорта полного состояния рабочего стола:

```json
{
  "version": "1.0",
  "exportedAt": "2026-08-11T13:30:00Z",
  "theme": {},
  "layout": { "columns": 12, "gap": 16 },
  "widgets": [],
  "settings": {}
}
```
