import type { WidgetDefinition } from '@/core/widget';
import type { IframeSettings } from './types';

export const iframeManifest: WidgetDefinition<IframeSettings> = {
  id: 'iframe',
  nameKey: 'widgets.iframe',
  descriptionKey: 'widgetDesc.iframe',
  version: '2.5.0',
  iconName: 'Globe',
  category: 'utilities',
  surface: 'panel',
  permissions: ['network'],
  size: {
    defaultW: 6,
    defaultH: 4,
    minW: 4,
    minH: 3,
  },
  settingsSchema: [
    {
      key: 'url',
      labelKey: 'URL адрес страницы',
      type: 'text',
      defaultValue: 'https://wxt.dev',
    },
    {
      key: 'zoom',
      labelKey: 'Масштаб страницы (%)',
      type: 'slider',
      defaultValue: 100,
      min: 50,
      max: 150,
      step: 10,
      unit: '%',
    },
  ],
  load: () => import('./IframeWidget').then((m) => ({ default: m.IframeWidget })),
};
