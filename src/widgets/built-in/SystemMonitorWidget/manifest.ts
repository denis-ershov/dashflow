import type { WidgetDefinition } from '@/core/widget';
import type { SystemMonitorSettings } from './types';

export const systemMonitorManifest: WidgetDefinition<SystemMonitorSettings> = {
  id: 'systemMonitor',
  nameKey: 'widgets.systemMonitor',
  descriptionKey: 'widgetDesc.systemMonitor',
  version: '2.0.0',
  iconName: 'Cpu',
  category: 'developer',
  surface: 'panel',
  size: {
    defaultW: 6,
    defaultH: 2,
    minW: 4,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'showNetwork',
      labelKey: 'common.enabled',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showBattery',
      labelKey: 'common.enabled',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./SystemMonitorWidget').then((m) => ({ default: m.SystemMonitorWidget })),
};
