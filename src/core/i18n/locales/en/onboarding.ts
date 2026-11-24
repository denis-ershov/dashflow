import type { LocaleShape } from '../../types';
import type { onboarding as ruOnboarding } from '../ru/onboarding';

export const onboarding: LocaleShape<typeof ruOnboarding> = {
  welcome: 'Welcome to DashFlow',
  intro:
    'Choose your language and a city for weather. The city is optional, and location access is never requested.',
  language: 'Interface language',
  russian: 'Русский',
  english: 'English',
  city: 'City for weather (optional)',
  cityPlaceholder: 'For example, London',
  cityPrivacy: 'The city stays on this device. Your location is not used.',
  layoutTitle: 'Choose a layout',
  layoutDescription: 'You can change it or add widgets at any time.',
  presets: {
    empty: 'Empty',
    morning: 'Morning',
    focus: 'Focus',
  },
  presetDescriptions: {
    empty: 'A clean grid for your own widgets.',
    morning: 'Digest and daily agenda.',
    focus: 'Tasks and a Pomodoro timer.',
  },
  hubTitle: 'Connect Hub',
  hubDescription: 'You can skip this step and connect later in Settings.',
  configureHub: 'Set up Hub connection (optional)',
  continue: 'Continue',
  back: 'Back',
  finish: 'Finish',
  skip: 'Skip setup',
  saveError: 'Could not save your settings. Check storage and try again.',
};
