import type { LocaleShape } from '../../types';
import type { ru } from '../ru';
import { base } from './base';
import { shell } from './shell';
import { panels } from './panels';
import { widgetFields } from './widgetFields';
import { widgets } from './widgets';

export const en: LocaleShape<typeof ru> = {
  ...base,
  ...shell,
  ...panels,
  ...widgetFields,
  ...widgets,
};
