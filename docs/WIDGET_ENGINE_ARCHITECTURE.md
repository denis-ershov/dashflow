# Архитектура Виджетов и Настроек (Widget Engine & Per-Widget Customization)

## 1. Обзор Виджетов и Конфигурации

В **DashFlow** каждый виджет изолирован и обладает собственной схемой параметров (`settingsSchema`). Настройки редактируются пользователем «на лету» через выкатной `WidgetSettingsDrawer`.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Widget Engine Pro                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ WidgetRegistry (11 Встроенных Виджетов + Плагины SDK) │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│         ┌────────────────────┴────────────────────┐         │
│         ▼                                         ▼         │
│  Built-in Widgets                         WidgetSettingsDrawer
│  ├── ClockWidget (12/24ч, секунды)        (Универсальная    │
│  ├── WeatherWidget (город, °C/°F)          боковая панель   │
│  ├── SearchWidget (провайдеры)             индивидуальной   │
│  ├── TodoWidget (фильтры задач)            настройки)       │
│  ├── NotesWidget (текстовый редактор)                       │
│  ├── QuickLinksWidget (фавиконки)                           │
│  ├── BookmarksWidget (папки закладок)                        │
│  ├── IframeWidget (встраивание сайтов)                       │
│  ├── PomodoroWidget (25/5 мин + звуки)                       │
│  ├── QuotesWidget (цитаты дня)                              │
│  ├── SystemMonitorWidget (сеть, батарея)                    │
│  └── RssWidget (новостной ридер)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Схема Параметров Виджета (`settingsSchema`)

Каждый виджет регистрирует массив полей настроек:

```typescript
export interface WidgetSettingField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: Array<{ label: string; value: any }>;
  defaultValue?: any;
}
```

Все изменения автоматически сохраняются в `StorageAdapter` и обновляют состояние Zustand `useDashboardStore.updateWidgetSettings(instanceId, settings)`.
