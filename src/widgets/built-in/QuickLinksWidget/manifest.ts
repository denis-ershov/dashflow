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
      labelKey: 'widgetFields.quickLinks.shape.label',
      type: 'segmented',
      defaultValue: 'squircle',
      section: 'appearance',
      helperText: 'widgetFields.quickLinks.shape.help',
      options: [
        { labelKey: 'widgetFields.quickLinks.shape.options.squircle', value: 'squircle' },
        { labelKey: 'widgetFields.quickLinks.shape.options.circle', value: 'circle' },
        { labelKey: 'widgetFields.quickLinks.shape.options.square', value: 'square' },
      ],
    },
    {
      key: 'columns',
      labelKey: 'widgetFields.quickLinks.columns.label',
      type: 'segmented',
      defaultValue: 4,
      section: 'appearance',
      helperText: 'widgetFields.quickLinks.columns.help',
      options: [
        { labelKey: 'widgetFields.quickLinks.columns.options.2', value: 2 },
        { labelKey: 'widgetFields.quickLinks.columns.options.3', value: 3 },
        { labelKey: 'widgetFields.quickLinks.columns.options.4', value: 4 },
        { labelKey: 'widgetFields.quickLinks.columns.options.6', value: 6 },
      ],
    },
    {
      key: 'showTitles',
      labelKey: 'widgetFields.quickLinks.showTitles.label',
      type: 'boolean',
      defaultValue: true,
      section: 'appearance',
      helperText: 'widgetFields.quickLinks.showTitles.help',
    },
    {
      key: 'showDomain',
      labelKey: 'widgetFields.quickLinks.showDomain.label',
      type: 'boolean',
      defaultValue: false,
      section: 'appearance',
      helperText: 'widgetFields.quickLinks.showDomain.help',
    },
    {
      key: 'openInNewTab',
      labelKey: 'widgetFields.quickLinks.openInNewTab.label',
      type: 'boolean',
      defaultValue: true,
      section: 'behavior',
      helperText: 'widgetFields.quickLinks.openInNewTab.help',
    },
  ],
  load: () => import('./QuickLinksWidget').then((m) => ({ default: m.QuickLinksWidget })),
};
