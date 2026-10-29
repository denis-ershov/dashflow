import { base } from './base';
import { shell } from './shell';
import { panels } from './panels';

/** Русский словарь — канонический: из него выводится тип TranslationKey */
export const ru = {
  ...base,
  ...shell,
  ...panels,
} as const;
