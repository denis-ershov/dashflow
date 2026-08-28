import type { WidgetDefinition } from '@/core/widget';
import type { QuotesSettings } from './types';

export const quotesManifest: WidgetDefinition<QuotesSettings> = {
  id: 'quotes',
  nameKey: 'widgets.quotes',
  descriptionKey: 'widgetDesc.quotes',
  version: '2.5.0',
  iconName: 'Quote',
  category: 'entertainment',
  surface: 'panel',
  size: {
    defaultW: 6,
    defaultH: 2,
    minW: 4,
    minH: 2,
  },
  settingsSchema: [
    {
      key: 'category',
      labelKey: 'Категория цитат',
      type: 'select',
      defaultValue: 'all',
      options: [
        { labelKey: 'Все категории', value: 'all' },
        { labelKey: 'Технологии и разработка', value: 'code' },
        { labelKey: 'Мудрость и философия', value: 'wisdom' },
        { labelKey: 'Мотивация и продуктивность', value: 'motivation' },
        { labelKey: 'Жизнь и творчество', value: 'life' },
      ],
    },
    {
      key: 'textAlign',
      labelKey: 'Выравнивание текста',
      type: 'select',
      defaultValue: 'center',
      options: [
        { labelKey: 'По центру', value: 'center' },
        { labelKey: 'По левому краю', value: 'left' },
      ],
    },
    {
      key: 'showAuthor',
      labelKey: 'Показывать автора',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showCopyButton',
      labelKey: 'Кнопка копирования цитаты',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./QuotesWidget').then((m) => ({ default: m.QuotesWidget })),
};
