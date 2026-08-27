import type { WidgetDefinition } from '@/core/widget';
import type { NotesSettings } from './types';

export const notesManifest: WidgetDefinition<NotesSettings> = {
  id: 'notes',
  nameKey: 'widgets.notes',
  descriptionKey: 'widgetDesc.notes',
  version: '2.0.0',
  iconName: 'FileText',
  category: 'productivity',
  surface: 'panel',
  permissions: ['storage'],
  size: {
    defaultW: 6,
    defaultH: 4,
    minW: 4,
    minH: 3,
  },
  settingsSchema: [
    {
      key: 'fontSize',
      labelKey: 'common.save',
      type: 'slider',
      defaultValue: 13,
      min: 11,
      max: 20,
      step: 1,
    },
  ],
  load: () => import('./NotesWidget').then((m) => ({ default: m.NotesWidget })),
};
