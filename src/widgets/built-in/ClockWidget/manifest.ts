import type { WidgetDefinition } from '@/core/widget';
import type { ClockSettings } from './types';

export const clockManifest: WidgetDefinition<ClockSettings> = {
  id: 'clock',
  nameKey: 'widgets.clock',
  descriptionKey: 'widgetDesc.clock',
  version: '3.0.0',
  iconName: 'Clock',
  category: 'hero',
  surface: 'chromeless',
  size: {
    defaultW: 4,
    defaultH: 2,
    minW: 3,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'clockStyle',
      labelKey: 'Стиль часов',
      type: 'select',
      defaultValue: 'digital',
      options: [
        { labelKey: 'Digital / Sans (Современный)', value: 'digital' },
        { labelKey: 'Минималистичный', value: 'minimal' },
        { labelKey: 'Элегантный Serif', value: 'serif' },
        { labelKey: 'Стеклянные Flip-карточки', value: 'flip' },
        { labelKey: 'Моноширинный', value: 'mono' },
      ],
    },
    {
      key: 'is24Hour',
      labelKey: '24-часовой формат времени',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showSeconds',
      labelKey: 'Показывать секунды',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'showDate',
      labelKey: 'Показывать дату и день недели',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showGreeting',
      labelKey: 'Показывать приветствие над часами',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'userName',
      labelKey: 'Имя для приветствия',
      type: 'text',
      defaultValue: '',
    },
  ],
  load: () => import('./ClockWidget').then((m) => ({ default: m.ClockWidget })),
};
