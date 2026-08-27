import type { WidgetDefinition } from '@/core/widget';
import type { BookmarkSettings } from './types';

export const bookmarksManifest: WidgetDefinition<BookmarkSettings> = {
  id: 'bookmarks',
  nameKey: 'widgets.bookmarks',
  descriptionKey: 'widgetDesc.bookmarks',
  version: '2.0.0',
  iconName: 'Bookmark',
  category: 'productivity',
  surface: 'tiles',
  permissions: ['bookmarks'],
  size: {
    defaultW: 6,
    defaultH: 4,
    minW: 1,
    minH: 1,
  },
  settingsSchema: [
    {
      key: 'mode',
      labelKey: 'common.save',
      type: 'select',
      defaultValue: 'folder',
      options: [
        { labelKey: 'common.enabled', value: 'folder' },
        { labelKey: 'common.enabled', value: 'single' },
      ],
    },
    {
      key: 'viewMode',
      labelKey: 'common.save',
      type: 'select',
      defaultValue: 'tiles',
      options: [
        { labelKey: 'common.enabled', value: 'tiles' },
        { labelKey: 'common.enabled', value: 'list' },
        { labelKey: 'common.enabled', value: 'table' },
      ],
    },
    {
      key: 'singleTitle',
      labelKey: 'common.save',
      type: 'text',
      defaultValue: 'Мой сайт',
    },
    {
      key: 'singleUrl',
      labelKey: 'common.save',
      type: 'text',
      defaultValue: 'https://google.com',
    },
  ],
  load: () => import('./BookmarksWidget').then((m) => ({ default: m.BookmarksWidget })),
};
