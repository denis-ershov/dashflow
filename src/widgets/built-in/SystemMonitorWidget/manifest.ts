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
      labelKey: 'Макет отображения',
      type: 'segmented',
      defaultValue: 'grid',
      section: 'appearance',
      helperText: 'Сетка карточек или подробные горизонтальные прогресс-бары',
      options: [
        { labelKey: 'Сетка', value: 'grid' },
        { labelKey: 'Шкалы (Бары)', value: 'bars' },
      ],
    },
    {
      key: 'showMemory',
      labelKey: 'Память JS Heap',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'Использование оперативной памяти вкладкой и браузером',
    },
    {
      key: 'showBattery',
      labelKey: 'Уровень заряда батареи',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'Процент батареи и индикатор подключения к сети питания',
    },
    {
      key: 'showNetwork',
      labelKey: 'Сетевое подключение',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'Статус онлайн/офлайн и тип интернет-канала (RTT/скорость)',
    },
    {
      key: 'showTabs',
      labelKey: 'Счетчик открытых вкладок',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'Количество активных вкладок в текущем окне браузера',
    },
    {
      key: 'refreshInterval',
      labelKey: 'Частота опроса датчиков',
      type: 'select',
      defaultValue: 2,
      section: 'behavior',
      helperText: 'Интервал обновления телеметрии (в секундах)',
      options: [
        { labelKey: 'Каждую секунду (1 сек)', value: 1 },
        { labelKey: 'Каждые 2 секунды (2 сек)', value: 2 },
        { labelKey: 'Каждые 5 секунд (5 сек)', value: 5 },
        { labelKey: 'Каждые 10 секунд (10 сек)', value: 10 },
      ],
    },
  ],
  load: () => import('./SystemMonitorWidget').then((m) => ({ default: m.SystemMonitorWidget })),
};
