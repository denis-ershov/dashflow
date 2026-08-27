import type { WidgetDefinition } from '@/core/widget';
import type { PomodoroSettings } from './types';

export const pomodoroManifest: WidgetDefinition<PomodoroSettings> = {
  id: 'pomodoro',
  nameKey: 'widgets.pomodoro',
  descriptionKey: 'widgetDesc.pomodoro',
  version: '2.0.0',
  iconName: 'Flame',
  category: 'productivity',
  surface: 'panel',
  permissions: ['storage'],
  size: {
    defaultW: 4,
    defaultH: 3,
    minW: 3,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'workTime',
      labelKey: 'common.save',
      type: 'slider',
      defaultValue: 25,
      min: 5,
      max: 60,
      step: 5,
    },
    {
      key: 'breakTime',
      labelKey: 'common.save',
      type: 'slider',
      defaultValue: 5,
      min: 1,
      max: 30,
      step: 1,
    },
  ],
  load: () => import('./PomodoroWidget').then((m) => ({ default: m.PomodoroWidget })),
};
