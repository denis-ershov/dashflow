# Архитектура контрактов виджетов (Widget Contracts Architecture)

## 1. Введение и назначение

Модуль `@/core/widget` определяет строгую типизированную систему манифестов, схем настроек и динамической загрузки компонентов виджетов для DashFlow.

Ключевые цели архитектуры:
- Полное устранение типа `any` из определений и свойств виджетов.
- Поддержка динамической загрузки (Code Splitting) через асинхронную функцию `load: () => Promise<{ default: ComponentType<WidgetProps<S>> }>`.
- Декларативное описание полей настроек с автоматической валидацией и генерацией UI (`WidgetSettingsForm`).
- Защита оболочки дашборда от сбоев при загрузке или удалении плагинов (`WidgetRegistry.getOrFallback`).

---

## 2. Структура компонентов и контракты

```
src/core/widget/
├── types.ts               # Базовые типы, перечисления (категории, разрешения, поверхности), манифест WidgetDefinition
├── validator.ts           # Чистый валидатор настроек по схеме с безопасным fallback
├── registry.ts            # Глобальный реестр определений виджетов WidgetRegistry
├── WidgetSettingsForm.tsx # Декларативный генератор формы настроек
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

---

## 3. Типы визуальных поверхностей (Surfaces)

Согласно Секции 3 спецификации, каждый виджет имеет один из трёх типов поверхности:
1. **`chromeless`**: Без рамки, без фона, без шапки (виджеты `clock`, `search`).
2. **`panel`**: Стеклянная полупрозрачная карточка с опциональным заголовком и действиями (`weather`, `notes`, `todo`).
3. **`tiles`**: Контейнер адаптивных плиток с внутренней сеткой (`bookmarks`, `quickLinks`).

---

## 4. Разрешения (Permissions)

Каждый виджет и плагин декларирует список запрашиваемых разрешений из строгого перечисления:
- `'storage'`: Доступ к изолированному хранилищу настроек.
- `'network'`: Право выполнять сетевые запросы `fetch`.
- `'bookmarks'`: Доступ к синхронизации с закладками Chrome.
- `'geolocation'`: Доступ к определению текущего местоположения пользователя (`navigator.geolocation`).
- `'geolocation'`: Доступ к координатам пользователя для прогноза погоды.

---

## 5. Валидация настроек и генерация UI

- Функция `validateWidgetSettings<S>(raw, schema)` гарантирует санитизацию любого внешнего ввода перед передачей в компонент виджета. При несоответствии типа, выходе за границы диапазона `min`/`max` или неизвестном значении подставляется `defaultValue`.
- Компонент `WidgetSettingsForm` автоматически отрисовывает поля (`text`, `number`, `boolean`, `slider`, `select`, `color`, `multiselect`), используя компоненты дизайн-системы DashFlow (`Input`, `Switch`, `Slider`, `Button`).

---

## 6. Защита от сбоев (Failure Isolation)

Если запрошен неизвестный или удалённый виджет, метод `WidgetRegistry.getOrFallback(id)` возвращает безопасный системный манифест с компонентом-заглушкой, предотвращая падение сетки дашборда.
