import type { WidgetDefinition } from '@/core/widget';
import type { SystemMonitorSettings } from './types';

export const systemMonitorManifest: WidgetDefinition<SystemMonitorSettings> = {
  id: 'systemMonitor',
  nameKey: 'widgets.systemMonitor',
  descriptionKey: 'widgetDesc.systemMonitor',
  version: '2.5.0',
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
      labelKey: 'Сеть и онлайн-статус',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showBattery',
      labelKey: 'Уровень заряда батареи',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showTabs',
      labelKey: 'Счетчик открытых вкладок',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showMemory',
      labelKey: 'Использование памяти JS Heap',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./SystemMonitorWidget').then((m) => ({ default: m.SystemMonitorWidget })),
};
