import type { WidgetDefinition } from '@/core/widget';
import type { RssSettings } from './types';

export const rssManifest: WidgetDefinition<RssSettings> = {
  id: 'rssReader',
  nameKey: 'widgets.rssReader',
  descriptionKey: 'widgetDesc.rssReader',
  version: '2.0.0',
  iconName: 'Rss',
  category: 'news',
  surface: 'panel',
  permissions: ['network', 'storage'],
  size: {
    defaultW: 6,
    defaultH: 4,
    minW: 4,
    minH: 3,
  },
  settingsSchema: [
    {
      key: 'feedUrl',
      labelKey: 'common.save',
      type: 'text',
      defaultValue: 'https://habr.com/ru/rss/best/daily/',
    },
    {
      key: 'viewMode',
      labelKey: 'common.save',
      type: 'select',
      defaultValue: 'thumbnails',
      options: [
        { labelKey: 'common.enabled', value: 'thumbnails' },
        { labelKey: 'common.enabled', value: 'compact' },
        { labelKey: 'common.enabled', value: 'cards' },
      ],
    },
  ],
  load: () => import('./RssWidget').then((m) => ({ default: m.RssWidget })),
};
