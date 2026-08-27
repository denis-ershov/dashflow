import type { WidgetDefinition } from '@/core/widget';
import type { ClockSettings } from './types';

export const clockManifest: WidgetDefinition<ClockSettings> = {
  id: 'clock',
  nameKey: 'widgets.clock',
  descriptionKey: 'widgetDesc.clock',
  version: '2.0.0',
  iconName: 'Clock',
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
      key: 'is24Hour',
      labelKey: 'common.enabled',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showSeconds',
      labelKey: 'common.enabled',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showDate',
      labelKey: 'common.enabled',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./ClockWidget').then((m) => ({ default: m.ClockWidget })),
};
