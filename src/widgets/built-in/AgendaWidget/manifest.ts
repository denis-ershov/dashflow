import type { WidgetDefinition } from '@/core/widget';

export const agendaManifest: WidgetDefinition = {
  id: 'agenda',
  nameKey: 'widgets.agenda',
  descriptionKey: 'widgetDesc.agenda',
  version: '1.0.0',
  iconName: 'Calendar',
  category: 'productivity',
  surface: 'panel',
  permissions: ['network', 'storage'],
  size: { defaultW: 6, defaultH: 5, minW: 3, minH: 4 },
  load: () => import('./AgendaWidget').then((module) => ({ default: module.AgendaWidget })),
};
