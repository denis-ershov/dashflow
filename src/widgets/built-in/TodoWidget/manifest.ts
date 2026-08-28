import type { WidgetDefinition } from '@/core/widget';
import type { TodoSettings } from './types';

export const todoManifest: WidgetDefinition<TodoSettings> = {
  id: 'todo',
  nameKey: 'widgets.todo',
  descriptionKey: 'widgetDesc.todo',
  version: '2.5.0',
  iconName: 'CheckSquare',
  category: 'productivity',
  surface: 'panel',
  permissions: ['storage'],
  size: {
    defaultW: 6,
    defaultH: 4,
    minW: 4,
    minH: 3,
  },
  settingsSchema: [
    {
      key: 'defaultTab',
      labelKey: 'Вкладка по умолчанию',
      type: 'select',
      defaultValue: 'todos',
      options: [
        { labelKey: 'Задачи', value: 'todos' },
        { labelKey: 'Привычки', value: 'habits' },
      ],
    },
    {
      key: 'filter',
      labelKey: 'Фильтр задач',
      type: 'select',
      defaultValue: 'all',
      options: [
        { labelKey: 'Все задачи', value: 'all' },
        { labelKey: 'Только активные', value: 'active' },
        { labelKey: 'Только завершенные', value: 'completed' },
      ],
    },
    {
      key: 'defaultPriority',
      labelKey: 'Приоритет новой задачи',
      type: 'select',
      defaultValue: 'medium',
      options: [
        { labelKey: 'Низкий', value: 'low' },
        { labelKey: 'Средний', value: 'medium' },
        { labelKey: 'Высокий', value: 'high' },
      ],
    },
    {
      key: 'showProgress',
      labelKey: 'Показывать индикатор прогресса',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./TodoWidget').then((m) => ({ default: m.TodoWidget })),
};
