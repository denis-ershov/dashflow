import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импорт переводов
import ruCommon from '../locales/ru/common.json';
import ruWidgets from '../locales/ru/widgets.json';
import ruSettings from '../locales/ru/settings.json';

import enCommon from '../locales/en/common.json';
import enWidgets from '../locales/en/widgets.json';
import enSettings from '../locales/en/settings.json';

const resources = {
  ru: {
    common: ruCommon,
    widgets: ruWidgets,
    settings: ruSettings
  },
  en: {
    common: enCommon,
    widgets: enWidgets,
    settings: enSettings
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    defaultNS: 'common',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'dashboard-language',
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false // React уже экранирует по умолчанию
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;