import type { WidgetDefinition } from '@/core/widget';
import type { GreetingSettings } from './types';

export const greetingManifest: WidgetDefinition<GreetingSettings> = {
  id: 'greeting',
  nameKey: 'widgets.greeting',
  descriptionKey: 'widgetDesc.greeting',
  version: '1.0.0',
  iconName: 'Sparkles',
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
      key: 'userName',
      labelKey: 'Имя пользователя',
      type: 'text',
      defaultValue: '',
    },
    {
      key: 'showIcon',
      labelKey: 'Показывать эмодзи времени суток',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'fontSize',
      labelKey: 'Размер шрифта',
      type: 'select',
      defaultValue: 'lg',
      options: [
        { labelKey: 'Компактный (sm)', value: 'sm' },
        { labelKey: 'Обычный (md)', value: 'md' },
        { labelKey: 'Крупный (lg)', value: 'lg' },
        { labelKey: 'Очень крупный (xl)', value: 'xl' },
      ],
    },
    {
      key: 'align',
      labelKey: 'Выравнивание текста',
      type: 'select',
      defaultValue: 'center',
      options: [
        { labelKey: 'По центру', value: 'center' },
        { labelKey: 'По левому краю', value: 'left' },
        { labelKey: 'По правому краю', value: 'right' },
      ],
    },
  ],
  load: () => import('./GreetingWidget').then((m) => ({ default: m.GreetingWidget })),
};
