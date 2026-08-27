import type { WidgetDefinition } from '@/core/widget';
import type { QuickLinksSettings } from './types';

export const quickLinksManifest: WidgetDefinition<QuickLinksSettings> = {
  id: 'quickLinks',
  nameKey: 'widgets.quickLinks',
  descriptionKey: 'widgetDesc.quickLinks',
  version: '2.0.0',
  iconName: 'Link',
  category: 'productivity',
  surface: 'tiles',
  permissions: ['storage'],
  size: {
    defaultW: 6,
    defaultH: 3,
    minW: 4,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'showTitles',
      labelKey: 'common.enabled',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./QuickLinksWidget').then((m) => ({ default: m.QuickLinksWidget })),
};
