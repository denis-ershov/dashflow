import type { LocaleShape } from '../../types';
import type { ru } from '../ru';
import { base } from './base';
import { shell } from './shell';
import { panels } from './panels';
import { widgetFields } from './widgetFields';
import { widgets } from './widgets';
import { reminders } from './reminders';
import { digest } from './digest';
import { agenda } from './agenda';
import { capture } from './capture';
import { hub } from './hub';
import { onboarding } from './onboarding';
import { agents } from './agents';
import { integrations } from './integrations';

export const en: LocaleShape<typeof ru> = {
  ...base,
  ...shell,
  ...panels,
  ...widgetFields,
  ...widgets,
  reminders,
  digest,
  agenda,
  capture,
  hub,
  onboarding,
  agents,
  integrations,
};
