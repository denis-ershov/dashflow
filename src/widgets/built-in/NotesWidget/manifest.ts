import type { WidgetDefinition } from '@/core/widget';
import type { NotesSettings } from './types';

export const notesManifest: WidgetDefinition<NotesSettings> = {
  id: 'notes',
  nameKey: 'widgets.notes',
  descriptionKey: 'widgetDesc.notes',
  version: '2.5.0',
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
      key: 'defaultMode',
      labelKey: 'Режим по умолчанию',
      type: 'select',
      defaultValue: 'edit',
      options: [
        { labelKey: 'Редактирование', value: 'edit' },
        { labelKey: 'Markdown просмотр', value: 'preview' },
      ],
    },
    {
      key: 'fontSize',
      labelKey: 'Размер шрифта',
      type: 'slider',
      defaultValue: 13,
      min: 11,
      max: 20,
      step: 1,
      unit: 'px',
    },
    {
      key: 'showWordCount',
      labelKey: 'Показывать счетчик слов',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'showSaveStatus',
      labelKey: 'Показывать статус сохранения',
      type: 'boolean',
      defaultValue: true,
    },
  ],
  load: () => import('./NotesWidget').then((m) => ({ default: m.NotesWidget })),
};
