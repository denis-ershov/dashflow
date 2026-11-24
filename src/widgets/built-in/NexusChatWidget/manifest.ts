import type { WidgetDefinition } from '@/core/widget';
import type { NexusChatSettings } from './types';

export const nexusChatManifest: WidgetDefinition<NexusChatSettings> = {
  id: 'nexusChat',
  nameKey: 'widgets.nexusChat',
  descriptionKey: 'widgetDesc.nexusChat',
  version: '1.0.0',
  iconName: 'MessageSquare',
  category: 'productivity',
  surface: 'panel',
  permissions: ['network', 'storage'],
  size: {
    defaultW: 6,
    defaultH: 6,
    minW: 4,
    minH: 4,
  },
  settingsSchema: [
    {
      key: 'chatEndpointUrl',
      labelKey: 'widgetFields.nexusChat.chatEndpointUrl.label',
      type: 'text',
      defaultValue: '',
      section: 'data',
      placeholder: 'widgetFields.nexusChat.chatEndpointUrl.placeholder',
      helperText: 'widgetFields.nexusChat.chatEndpointUrl.help',
    },
    {
      key: 'adminUrl',
      labelKey: 'widgetFields.nexusChat.adminUrl.label',
      type: 'text',
      defaultValue: '',
      section: 'data',
      placeholder: 'widgetFields.nexusChat.adminUrl.placeholder',
      helperText: 'widgetFields.nexusChat.adminUrl.help',
    },
    {
      key: 'model',
      labelKey: 'widgetFields.nexusChat.model.label',
      type: 'text',
      defaultValue: 'nexus-default',
      section: 'behavior',
      placeholder: 'widgetFields.nexusChat.model.placeholder',
      helperText: 'widgetFields.nexusChat.model.help',
    },
  ],
  load: () => import('./NexusChatWidget').then((module) => ({ default: module.NexusChatWidget })),
  loadSettings: () =>
    import('./NexusChatSettings').then((module) => ({ default: module.NexusChatSettingsForm })),
};
