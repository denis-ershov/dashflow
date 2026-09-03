# Архитектура контрактов виджетов (Widget Contracts Architecture)

## 1. Введение и назначение

Модуль `@/core/widget` определяет строгую типизированную систему манифестов, схем настроек и динамической загрузки компонентов виджетов для DashFlow.

Ключевые цели архитектуры:
- Полное устранение типа `any` из определений и свойств виджетов (100% покрытие типами).
- Поддержка динамической загрузки (Code Splitting) через асинхронную функцию `load: () => Promise<{ default: ComponentType<WidgetProps<S>> }>`.
- Декларативное описание полей настроек со смысловыми секциями (`appearance`, `behavior`, `data`, `advanced`), контекстными подсказками (`helperText`) и автоматической валидацией и генерацией UI (`WidgetSettingsForm`).
- Высококлассные элементы управления: текстовые поля, числовые инпуты, переключатели (Switch), ползунки (Slider), селекторы (Select), цветовые палитры (Color) и таблетки быстрого переключения (`segmented`).
- Защита оболочки дашборда от сбоев при загрузке или удалении плагинов (`WidgetRegistry.getOrFallback`).

---

## 2. Структура компонентов и контракты

```
src/core/widget/
├── types.ts               # Базовые типы, перечисления (категории, разрешения, поверхности), манифест WidgetDefinition
├── validator.ts           # Чистый валидатор настроек по схеме с безопасным fallback
├── registry.ts            # Глобальный реестр определений виджетов WidgetRegistry
├── WidgetSettingsForm.tsx # Декларативный генератор формы настроек с секционированием и Apple/Linear UX
└── index.ts               # Единая точка реэкспорта
```

### Манифест виджета `WidgetDefinition<S>`

```typescript
export interface WidgetDefinition<S = Record<string, unknown>> {
  id: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  version: string;
  iconName: string;
  category: WidgetCategory;
  surface: WidgetSurfaceType;
  size: WidgetSize;
  permissions?: WidgetPermission[];
  settingsSchema?: WidgetSettingFieldSchema<S>[];
  load: () => Promise<{ default: React.ComponentType<WidgetProps<S>> }>;
  loadSettings?: () => Promise<{ default: React.ComponentType<{ settings: S; onChange: (newSettings: S) => void }> }>;
}
```

### Схема поля настройки `WidgetSettingFieldSchema<S>`

```typescript
export type WidgetSettingFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'slider'
  | 'multiselect'
  | 'segmented';

export interface WidgetSettingFieldSchema<S, K extends keyof S = keyof S> {
  key: K;
  labelKey: string;
  type: WidgetSettingFieldType;
  defaultValue: S[K];
  helperText?: string;
  section?: 'appearance' | 'behavior' | 'data' | 'advanced' | (string & {});
  placeholder?: string;
  options?: WidgetSettingOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}
```

---

## 3. Типы визуальных поверхностей (Surfaces)

Согласно спецификации, каждый виджет имеет один из трёх типов поверхности:
1. **`chromeless`**: Без рамки, без фона, без шапки (виджеты `clock`, `search`, `greeting`, `yearProgress`).
2. **`panel`**: Стеклянная полупрозрачная карточка с опциональным заголовком и действиями (`weather`, `notes`, `todo`, `pomodoro`, `quotes`, `systemMonitor`, `rssReader`, `iframe`).
3. **`tiles`**: Контейнер адаптивных плиток с внутренней сеткой (`bookmarks`, `quickLinks`).

---

## 4. Разрешения (Permissions)

Каждый виджет и плагин декларирует список запрашиваемых разрешений из строгого перечисления:
- `'storage'`: Доступ к изолированному хранилищу настроек.
- `'network'`: Право выполнять сетевые запросы `fetch`.
- `'bookmarks'`: Чтение дерева закладок браузера через Chrome API.
- `'tabs'`: Доступ к активным вкладкам.
- `'geolocation'`: Определение текущих координат для прогноза погоды.
- `'topSites'`: Доступ к часто посещаемым сайтам.
