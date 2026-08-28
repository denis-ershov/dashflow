import type { WidgetDefinition } from '@/core/widget';
import type { RssSettings } from './types';

export const rssManifest: WidgetDefinition<RssSettings> = {
  id: 'rssReader',
  nameKey: 'widgets.rssReader',
  descriptionKey: 'widgetDesc.rssReader',
  version: '2.5.0',
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
      labelKey: 'URL RSS-ленты',
      type: 'text',
      defaultValue: 'https://habr.com/ru/rss/best/daily/',
    },
    {
      key: 'viewMode',
      labelKey: 'Стиль отображения',
      type: 'select',
      defaultValue: 'thumbnails',
      options: [
        { labelKey: 'С миниатюрами', value: 'thumbnails' },
        { labelKey: 'Компактный список', value: 'compact' },
        { labelKey: 'Крупные карточки', value: 'cards' },
      ],
    },
    {
      key: 'itemCount',
      labelKey: 'Количество новостей',
      type: 'slider',
      defaultValue: 10,
      min: 3,
      max: 20,
      step: 1,
    },
    {
      key: 'showDate',
      labelKey: 'Показывать дату публикации',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./RssWidget').then((m) => ({ default: m.RssWidget })),
};
