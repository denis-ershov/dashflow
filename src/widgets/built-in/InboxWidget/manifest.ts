import type { WidgetDefinition } from '@/core/widget';

export const inboxManifest: WidgetDefinition = {
  id: 'inbox',
  nameKey: 'widgets.inbox',
  descriptionKey: 'widgetDesc.inbox',
  version: '1.0.0',
  iconName: 'Inbox',
  category: 'productivity',
  surface: 'panel',
  permissions: ['storage'],
  size: { defaultW: 6, defaultH: 5, minW: 4, minH: 4 },
  load: () => import('./InboxWidget').then((module) => ({ default: module.InboxWidget })),
};
