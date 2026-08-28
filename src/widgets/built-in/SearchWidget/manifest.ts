import type { WidgetDefinition } from '@/core/widget';
import type { SearchSettings } from './types';

export const searchManifest: WidgetDefinition<SearchSettings> = {
  id: 'search',
  nameKey: 'widgets.search',
  descriptionKey: 'widgetDesc.search',
  version: '3.0.0',
  iconName: 'Search',
  category: 'hero',
  surface: 'chromeless',
  size: {
    defaultW: 6,
    defaultH: 2,
    minW: 4,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'searchStyle',
      labelKey: 'Стиль поисковой строки',
      type: 'select',
      defaultValue: 'bar',
      options: [
        { labelKey: 'Капсула Hero (Стильная строка)', value: 'bar' },
        { labelKey: 'Классические кнопки провайдеров', value: 'tiles' },
      ],
    },
    {
      key: 'engine',
      labelKey: 'Поисковая система по умолчанию',
      type: 'select',
      defaultValue: 'google',
      options: [
        { labelKey: 'Google', value: 'google' },
        { labelKey: 'Яндекс', value: 'yandex' },
        { labelKey: 'DuckDuckGo', value: 'duckduckgo' },
        { labelKey: 'Microsoft Bing', value: 'bing' },
        { labelKey: 'GitHub', value: 'github' },
        { labelKey: 'YouTube', value: 'youtube' },
        { labelKey: 'Perplexity AI', value: 'perplexity' },
      ],
    },
    {
      key: 'showEngineSelector',
      labelKey: 'Показывать переключатель поисковиков',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'openInNewTab',
      labelKey: 'Открывать результаты в новой вкладке',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  load: () => import('./SearchWidget').then((m) => ({ default: m.SearchWidget })),
};
