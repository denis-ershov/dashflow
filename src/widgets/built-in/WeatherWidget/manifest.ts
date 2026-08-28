import type { WidgetDefinition } from '@/core/widget';
import type { WeatherSettings } from './types';

export const weatherManifest: WidgetDefinition<WeatherSettings> = {
  id: 'weather',
  nameKey: 'widgets.weather',
  descriptionKey: 'widgetDesc.weather',
  version: '2.5.0',
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
      labelKey: 'Город',
      type: 'text',
      defaultValue: 'Москва',
    },
    {
      key: 'tempUnit',
      labelKey: 'Единицы измерения',
      type: 'select',
      defaultValue: 'celsius',
      options: [
        { labelKey: 'Цельсий (°C)', value: 'celsius' },
        { labelKey: 'Фаренгейт (°F)', value: 'fahrenheit' },
      ],
    },
    {
      key: 'showHourly',
      labelKey: 'Показывать почасовой прогноз',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showFeelsLike',
      labelKey: 'Показывать ощущаемую температуру',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showHumidity',
      labelKey: 'Показывать влажность',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showWind',
      labelKey: 'Показывать скорость ветра',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./WeatherWidget').then((m) => ({ default: m.WeatherWidget })),
};
