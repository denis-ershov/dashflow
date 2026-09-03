import type { WidgetDefinition } from '@/core/widget';
import type { QuickLinksSettings } from './types';

export const quickLinksManifest: WidgetDefinition<QuickLinksSettings> = {
  id: 'quickLinks',
  nameKey: 'widgets.quickLinks',
  descriptionKey: 'widgetDesc.quickLinks',
  version: '2.5.0',
  iconName: 'Link',
  category: 'productivity',
  surface: 'tiles',
  permissions: ['storage'],
  size: {
    defaultW: 6,
    defaultH: 3,
    minW: 4,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'shape',
      labelKey: 'Форма иконок',
      type: 'segmented',
      defaultValue: 'squircle',
      section: 'appearance',
      helperText: 'Геометрический стиль иконок ссылок в сетке',
      options: [
        { labelKey: 'Сквиркл', value: 'squircle' },
        { labelKey: 'Круг', value: 'circle' },
        { labelKey: 'Квадрат', value: 'square' },
      ],
    },
    {
      key: 'columns',
      labelKey: 'Количество колонок в сетке',
      type: 'segmented',
      defaultValue: 4,
      section: 'appearance',
      helperText: 'Плотность размещения ссылок по ширине',
      options: [
        { labelKey: '2', value: 2 },
        { labelKey: '3', value: 3 },
        { labelKey: '4', value: 4 },
        { labelKey: '6', value: 6 },
      ],
    },
    {
      key: 'showTitles',
      labelKey: 'Отображать названия сайтов',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'Показывать текстовые подписи под иконками ссылок',
    },
    {
      key: 'showDomain',
      labelKey: 'Отображать домен (URL)',
      type: 'boolean',
      defaultValue: false,
      section: 'appearance',
      helperText: 'Показывать краткий адрес сайта под заголовком',
    },
    {
      key: 'openInNewTab',
      labelKey: 'Открывать в новой вкладке',
      type: 'boolean',
      defaultValue: true,
      section: 'behavior',
      helperText: 'Переходить по ссылкам в новой вкладке браузера',
    },
  ],
  load: () => import('./QuickLinksWidget').then((m) => ({ default: m.QuickLinksWidget })),
};
