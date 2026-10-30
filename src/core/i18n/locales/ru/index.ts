import { base } from './base';
import { shell } from './shell';
import { panels } from './panels';
import { widgetFields } from './widgetFields';
import { widgets } from './widgets';

/** Русский словарь — канонический: из него выводится тип TranslationKey */
export const ru = {
  ...base,
  ...shell,
  ...panels,
  ...widgetFields,
  ...widgets,
} as const;
