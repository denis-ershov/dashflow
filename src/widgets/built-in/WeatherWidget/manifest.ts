import type { WidgetDefinition } from '@/core/widget';
import type { WeatherSettings } from './types';
import { DEFAULT_CITY } from './cities';

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
      labelKey: 'widgetFields.weather.city.label',
      type: 'text',
      defaultValue: DEFAULT_CITY,
      section: 'data',
      helperText: 'widgetFields.weather.city.help',
    },
    {
      key: 'viewMode',
      labelKey: 'widgetFields.weather.viewMode.label',
      type: 'segmented',
      defaultValue: 'dashboard',
      section: 'appearance',
      helperText: 'widgetFields.weather.viewMode.help',
      options: [
        { labelKey: 'widgetFields.weather.viewMode.options.dashboard', value: 'dashboard' },
        { labelKey: 'widgetFields.weather.viewMode.options.compact', value: 'compact' },
        { labelKey: 'widgetFields.weather.viewMode.options.hourly', value: 'hourly' },
        { labelKey: 'widgetFields.weather.viewMode.options.weekly', value: 'weekly' },
      ],
    },
    {
      key: 'tempUnit',
      labelKey: 'widgetFields.weather.tempUnit.label',
      type: 'segmented',
      defaultValue: 'celsius',
      section: 'appearance',
      helperText: 'widgetFields.weather.tempUnit.help',
      options: [
        { labelKey: 'widgetFields.weather.tempUnit.options.celsius', value: 'celsius' },
        { labelKey: 'widgetFields.weather.tempUnit.options.fahrenheit', value: 'fahrenheit' },
      ],
    },
    {
      key: 'windSpeedUnit',
      labelKey: 'widgetFields.weather.windSpeedUnit.label',
      type: 'select',
      defaultValue: 'ms',
      section: 'data',
      helperText: 'widgetFields.weather.windSpeedUnit.help',
      options: [
        { labelKey: 'widgetFields.weather.windSpeedUnit.options.ms', value: 'ms' },
        { labelKey: 'widgetFields.weather.windSpeedUnit.options.kmh', value: 'kmh' },
        { labelKey: 'widgetFields.weather.windSpeedUnit.options.mph', value: 'mph' },
      ],
    },
    {
      key: 'pressureUnit',
      labelKey: 'widgetFields.weather.pressureUnit.label',
      type: 'select',
      defaultValue: 'mmhg',
      section: 'data',
      helperText: 'widgetFields.weather.pressureUnit.help',
      options: [
        { labelKey: 'widgetFields.weather.pressureUnit.options.mmhg', value: 'mmhg' },
        { labelKey: 'widgetFields.weather.pressureUnit.options.hpa', value: 'hpa' },
      ],
    },
    {
      key: 'showMetrics',
      labelKey: 'widgetFields.weather.showMetrics.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.weather.showMetrics.help',
    },
    {
      key: 'showSunTimes',
      labelKey: 'widgetFields.weather.showSunTimes.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.weather.showSunTimes.help',
    },
  ],
  load: () => import('./WeatherWidget').then((m) => ({ default: m.WeatherWidget })),
  loadSettings: () => import('./WeatherSettingsForm').then((m) => ({ default: m.WeatherSettingsForm })),
};
