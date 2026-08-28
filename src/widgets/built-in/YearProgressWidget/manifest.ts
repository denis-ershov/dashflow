import type { WidgetDefinition } from '@/core/widget';
import type { YearProgressSettings } from './types';

export const yearProgressManifest: WidgetDefinition<YearProgressSettings> = {
  id: 'yearProgress',
  nameKey: 'widgets.yearProgress',
  descriptionKey: 'widgetDesc.yearProgress',
  version: '1.0.0',
  iconName: 'Calendar',
  category: 'hero',
  surface: 'chromeless',
  size: {
    defaultW: 4,
    defaultH: 2,
    minW: 2,
    minH: 1,
  },
  settingsSchema: [
    {
      key: 'defaultMode',
      labelKey: 'Режим по умолчанию',
      type: 'select',
      defaultValue: 'year',
      options: [
        { labelKey: 'Прогресс года', value: 'year' },
        { labelKey: 'Прогресс месяца', value: 'month' },
        { labelKey: 'Прогресс дня', value: 'day' },
      ],
    },
    {
      key: 'showPercentage',
      labelKey: 'Показывать проценты',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'progressStyle',
      labelKey: 'Стиль индикатора',
      type: 'select',
      defaultValue: 'pill',
      options: [
        { labelKey: 'Капсула (Pill)', value: 'pill' },
        { labelKey: 'Полноразмерная шкала', value: 'bar' },
      ],
    },
  ],
  load: () => import('./YearProgressWidget').then((m) => ({ default: m.YearProgressWidget })),
};
