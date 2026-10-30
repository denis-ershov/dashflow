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
      key: 'layoutStyle',
      labelKey: 'widgetFields.systemMonitor.layoutStyle.label',
      type: 'segmented',
      defaultValue: 'grid',
      section: 'appearance',
      helperText: 'widgetFields.systemMonitor.layoutStyle.help',
      options: [
        { labelKey: 'widgetFields.systemMonitor.layoutStyle.options.grid', value: 'grid' },
        { labelKey: 'widgetFields.systemMonitor.layoutStyle.options.bars', value: 'bars' },
      ],
    },
    {
      key: 'showMemory',
      labelKey: 'widgetFields.systemMonitor.showMemory.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.systemMonitor.showMemory.help',
    },
    {
      key: 'showBattery',
      labelKey: 'widgetFields.systemMonitor.showBattery.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.systemMonitor.showBattery.help',
    },
    {
      key: 'showNetwork',
      labelKey: 'widgetFields.systemMonitor.showNetwork.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.systemMonitor.showNetwork.help',
    },
    {
      key: 'showTabs',
      labelKey: 'widgetFields.systemMonitor.showTabs.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.systemMonitor.showTabs.help',
    },
    {
      key: 'refreshInterval',
      labelKey: 'widgetFields.systemMonitor.refreshInterval.label',
      type: 'select',
      defaultValue: 2,
      section: 'behavior',
      helperText: 'widgetFields.systemMonitor.refreshInterval.help',
      options: [
        { labelKey: 'widgetFields.systemMonitor.refreshInterval.options.1', value: 1 },
        { labelKey: 'widgetFields.systemMonitor.refreshInterval.options.2', value: 2 },
        { labelKey: 'widgetFields.systemMonitor.refreshInterval.options.5', value: 5 },
        { labelKey: 'widgetFields.systemMonitor.refreshInterval.options.10', value: 10 },
      ],
    },
  ],
  load: () => import('./SystemMonitorWidget').then((m) => ({ default: m.SystemMonitorWidget })),
};
