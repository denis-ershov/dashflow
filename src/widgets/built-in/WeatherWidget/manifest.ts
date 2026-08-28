import type { WidgetDefinition } from '@/core/widget';
import type { WeatherSettings } from './types';

export const weatherManifest: WidgetDefinition<WeatherSettings> = {
  id: 'weather',
  nameKey: 'widgets.weather',
  descriptionKey: 'widgetDesc.weather',
  version: '3.7.0',
  iconName: 'CloudSun',
  category: 'utilities',
  surface: 'panel',
  permissions: ['network', 'storage', 'geolocation'],
  size: {
    defaultW: 4,
    defaultH: 2,
    minW: 2,
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
      labelKey: 'Единицы измерения температуры',
      type: 'select',
      defaultValue: 'celsius',
      options: [
        { labelKey: 'Цельсий (°C)', value: 'celsius' },
        { labelKey: 'Фаренгейт (°F)', value: 'fahrenheit' },
      ],
    },
    {
      key: 'viewMode',
      labelKey: 'Режим отображения',
      type: 'select',
      defaultValue: 'dashboard',
      options: [
        { labelKey: 'Метеостанция (Дашборд)', value: 'dashboard' },
        { labelKey: 'Компактный', value: 'compact' },
        { labelKey: 'По часам (24 часа)', value: 'hourly' },
        { labelKey: 'На 7 дней', value: 'weekly' },
      ],
    },
  ],
  load: () => import('./WeatherWidget').then((m) => ({ default: m.WeatherWidget })),
  loadSettings: () => import('./WeatherSettingsForm').then((m) => ({ default: m.WeatherSettingsForm })),
};
