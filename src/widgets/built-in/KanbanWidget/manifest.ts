import type { WidgetDefinition } from '@/core/widget';
import type { KanbanSettings } from './KanbanWidget';

export const kanbanManifest: WidgetDefinition<KanbanSettings> = {
  id: 'kanban',
  nameKey: 'widgets.kanban',
  descriptionKey: 'widgetDesc.kanban',
  version: '1.0.0',
  iconName: 'Columns3',
  category: 'productivity',
  surface: 'panel',
  permissions: ['storage'],
  size: { defaultW: 9, defaultH: 7, minW: 4, minH: 4 },
  load: () => import('./KanbanWidget').then((module) => ({ default: module.KanbanWidget })),
};
