import type { WidgetDefinition } from '@/core/widget';
import type { TodoSettings } from './types';

export const todoManifest: WidgetDefinition<TodoSettings> = {
  id: 'todo',
  nameKey: 'widgets.todo',
  descriptionKey: 'widgetDesc.todo',
  version: '2.0.0',
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
      key: 'filter',
      labelKey: 'common.save',
      type: 'select',
      defaultValue: 'all',
      options: [
        { labelKey: 'common.enabled', value: 'all' },
        { labelKey: 'common.enabled', value: 'active' },
        { labelKey: 'common.enabled', value: 'completed' },
      ],
    },
  ],
  load: () => import('./TodoWidget').then((m) => ({ default: m.TodoWidget })),
};
