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
      labelKey: 'Масштаб времени',
      type: 'segmented',
      defaultValue: 'year',
      section: 'behavior',
      helperText: 'Период расчета прогресса: год, квартал, месяц, неделя или день',
      options: [
        { labelKey: 'Год', value: 'year' },
        { labelKey: 'Квартал', value: 'quarter' },
        { labelKey: 'Месяц', value: 'month' },
        { labelKey: 'Неделя', value: 'week' },
        { labelKey: 'День', value: 'day' },
      ],
    },
    {
      key: 'progressStyle',
      labelKey: 'Стиль индикатора',
      type: 'segmented',
      defaultValue: 'pill',
      section: 'appearance',
      helperText: 'Компактная скругленная капсула или полноразмерная шкала',
      options: [
        { labelKey: 'Капсула', value: 'pill' },
        { labelKey: 'Шкала', value: 'bar' },
      ],
    },
    {
      key: 'gradient',
      labelKey: 'Цветовая палитра',
      type: 'select',
      defaultValue: 'cyan-indigo',
      section: 'appearance',
      helperText: 'Цветовой градиент заполнения полосы прогресса',
      options: [
        { labelKey: 'Cyber Cyan → Indigo (Фирменный)', value: 'cyan-indigo' },
        { labelKey: 'Emerald Forest (Зеленый)', value: 'emerald' },
        { labelKey: 'Sunset Coral (Закат)', value: 'sunset' },
        { labelKey: 'Amber Gold (Золотой)', value: 'amber' },
      ],
    },
    {
      key: 'showPercentage',
      labelKey: 'Показывать процент выполнения',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'Вывод числового процента с точностью до десятых',
    },
    {
      key: 'showRemainingDays',
      labelKey: 'Показывать оставшееся время',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'Текстовый счетчик оставшихся дней или часов до конца периода',
    },
  ],
  load: () => import('./YearProgressWidget').then((m) => ({ default: m.YearProgressWidget })),
};
