import type { LocaleShape } from '../../types';
import type { ru } from '../ru';
import { base } from './base';
import { shell } from './shell';
import { panels } from './panels';

export const en: LocaleShape<typeof ru> = {
  ...base,
  ...shell,
  ...panels,
};
