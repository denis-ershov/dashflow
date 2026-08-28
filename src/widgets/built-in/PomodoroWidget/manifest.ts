import type { WidgetDefinition } from '@/core/widget';
import type { PomodoroSettings } from './types';

export const pomodoroManifest: WidgetDefinition<PomodoroSettings> = {
  id: 'pomodoro',
  nameKey: 'widgets.pomodoro',
  descriptionKey: 'widgetDesc.pomodoro',
  version: '2.5.0',
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
      labelKey: 'Время работы (минут)',
      type: 'slider',
      defaultValue: 25,
      min: 1,
      max: 60,
      step: 1,
      unit: 'мин',
    },
    {
      key: 'breakTime',
      labelKey: 'Короткий перерыв (минут)',
      type: 'slider',
      defaultValue: 5,
      min: 1,
      max: 30,
      step: 1,
      unit: 'мин',
    },
    {
      key: 'timerStyle',
      labelKey: 'Стиль таймера',
      type: 'select',
      defaultValue: 'ring',
      options: [
        { labelKey: 'Круговой неоновый индикатор', value: 'ring' },
        { labelKey: 'Только крупные цифры', value: 'digital' },
      ],
    },
    {
      key: 'soundEnabled',
      labelKey: 'Звуковой сигнал при завершении',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./PomodoroWidget').then((m) => ({ default: m.PomodoroWidget })),
};
