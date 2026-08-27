import type { WidgetDefinition } from '@/core/widget';
import type { SearchSettings } from './types';

export const searchManifest: WidgetDefinition<SearchSettings> = {
  id: 'search',
  nameKey: 'widgets.search',
  descriptionKey: 'widgetDesc.search',
  version: '2.0.0',
  iconName: 'Search',
  category: 'utilities',
  surface: 'chromeless',
  size: {
    defaultW: 4,
    defaultH: 2,
    minW: 3,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'engine',
      labelKey: 'common.save',
      type: 'select',
      defaultValue: 'google',
      options: [
        { labelKey: 'common.enabled', value: 'google' },
        { labelKey: 'common.enabled', value: 'yandex' },
        { labelKey: 'common.enabled', value: 'duckduckgo' },
        { labelKey: 'common.enabled', value: 'bing' },
        { labelKey: 'common.enabled', value: 'youtube' },
        { labelKey: 'common.enabled', value: 'github' },
      ],
    },
  ],
  load: () => import('./SearchWidget').then((m) => ({ default: m.SearchWidget })),
};
