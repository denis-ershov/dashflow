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
      labelKey: 'widgetFields.yearProgress.defaultMode.label',
      type: 'segmented',
      defaultValue: 'year',
      section: 'behavior',
      helperText: 'widgetFields.yearProgress.defaultMode.help',
      options: [
        { labelKey: 'widgetFields.yearProgress.defaultMode.options.year', value: 'year' },
        { labelKey: 'widgetFields.yearProgress.defaultMode.options.quarter', value: 'quarter' },
        { labelKey: 'widgetFields.yearProgress.defaultMode.options.month', value: 'month' },
        { labelKey: 'widgetFields.yearProgress.defaultMode.options.week', value: 'week' },
        { labelKey: 'widgetFields.yearProgress.defaultMode.options.day', value: 'day' },
      ],
    },
    {
      key: 'progressStyle',
      labelKey: 'widgetFields.yearProgress.progressStyle.label',
      type: 'segmented',
      defaultValue: 'pill',
      section: 'appearance',
      helperText: 'widgetFields.yearProgress.progressStyle.help',
      options: [
        { labelKey: 'widgetFields.yearProgress.progressStyle.options.pill', value: 'pill' },
        { labelKey: 'widgetFields.yearProgress.progressStyle.options.bar', value: 'bar' },
      ],
    },
    {
      key: 'gradient',
      labelKey: 'widgetFields.yearProgress.gradient.label',
      type: 'select',
      defaultValue: 'cyan-indigo',
      section: 'appearance',
      helperText: 'widgetFields.yearProgress.gradient.help',
      options: [
        { labelKey: 'widgetFields.yearProgress.gradient.options.cyan-indigo', value: 'cyan-indigo' },
        { labelKey: 'widgetFields.yearProgress.gradient.options.emerald', value: 'emerald' },
        { labelKey: 'widgetFields.yearProgress.gradient.options.sunset', value: 'sunset' },
        { labelKey: 'widgetFields.yearProgress.gradient.options.amber', value: 'amber' },
      ],
    },
    {
      key: 'showPercentage',
      labelKey: 'widgetFields.yearProgress.showPercentage.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.yearProgress.showPercentage.help',
    },
    {
      key: 'showRemainingDays',
      labelKey: 'widgetFields.yearProgress.showRemainingDays.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.yearProgress.showRemainingDays.help',
    },
  ],
  load: () => import('./YearProgressWidget').then((m) => ({ default: m.YearProgressWidget })),
};
