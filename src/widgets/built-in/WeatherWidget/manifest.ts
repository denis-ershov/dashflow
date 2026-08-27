import type { WidgetDefinition } from '@/core/widget';
import type { WeatherSettings } from './types';

export const weatherManifest: WidgetDefinition<WeatherSettings> = {
  id: 'weather',
  nameKey: 'widgets.weather',
  descriptionKey: 'widgetDesc.weather',
  version: '2.0.0',
  iconName: 'CloudSun',
  category: 'utilities',
  surface: 'panel',
  permissions: ['network', 'storage'],
  size: {
    defaultW: 4,
    defaultH: 2,
    minW: 3,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'city',
      labelKey: 'common.save',
      type: 'text',
      defaultValue: 'Москва',
    },
  ],
  load: () => import('./WeatherWidget').then((m) => ({ default: m.WeatherWidget })),
};
