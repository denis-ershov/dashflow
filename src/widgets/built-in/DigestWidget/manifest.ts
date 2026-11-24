import type { WidgetDefinition } from '@/core/widget';

export const digestManifest: WidgetDefinition = {
  id: 'digest',
  nameKey: 'digest.name',
  descriptionKey: 'digest.description',
  version: '1.0.0',
  iconName: 'Newspaper',
  category: 'news',
  surface: 'panel',
  permissions: ['storage'],
  size: { defaultW: 6, defaultH: 5, minW: 4, minH: 4 },
  load: () => import('./DigestWidget').then((module) => ({ default: module.DigestWidget })),
};
