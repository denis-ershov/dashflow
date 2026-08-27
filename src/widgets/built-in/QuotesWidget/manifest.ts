import type { WidgetDefinition } from '@/core/widget';
import type { QuotesSettings } from './types';

export const quotesManifest: WidgetDefinition<QuotesSettings> = {
  id: 'quotes',
  nameKey: 'widgets.quotes',
  descriptionKey: 'widgetDesc.quotes',
  version: '2.0.0',
  iconName: 'Quote',
  category: 'entertainment',
  surface: 'panel',
  size: {
    defaultW: 6,
    defaultH: 2,
    minW: 4,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'category',
      labelKey: 'common.save',
      type: 'select',
      defaultValue: 'all',
      options: [
        { labelKey: 'common.enabled', value: 'all' },
        { labelKey: 'common.enabled', value: 'code' },
        { labelKey: 'common.enabled', value: 'wisdom' },
      ],
    },
  ],
  load: () => import('./QuotesWidget').then((m) => ({ default: m.QuotesWidget })),
};
