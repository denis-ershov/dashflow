export type SupportedLanguage = 'ru' | 'en';

export const translations = {
  ru: {
    app: {
      title: 'DashFlow',
      subtitle: 'Персональное рабочее пространство',
    },
    toolbar: {
      addWidget: 'Добавить виджет',
      search: 'Поиск (Ctrl+K)',
      settings: 'Настройки',
      themes: 'Темы',
      editLayout: 'Редактировать сетку',
      lockLayout: 'Зафиксировать сетку',
    },
    settings: {
      title: 'Настройки DashFlow',
      general: 'Основные',
      appearance: 'Внешний вид',
      layout: 'Сетка и расположение',
      widgets: 'Управление виджетами',
      language: 'Язык интерфейса',
      timeFormat: 'Формат времени',
      animations: 'Анимации и переходы',
    },
    widgets: {
      clock: 'Часы',
      weather: 'Погода',
      search: 'Поиск',
      bookmarks: 'Закладки',
      todo: 'Задачи',
      notes: 'Заметки',
      quickLinks: 'Быстрые ссылки',
    },
    common: {
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      close: 'Закрыть',
      loading: 'Загрузка...',
      error: 'Произошла ошибка',
      empty: 'Нет данных',
    },
  },
  en: {
    app: {
      title: 'DashFlow',
      subtitle: 'Personal Start Page',
    },
    toolbar: {
      addWidget: 'Add Widget',
      search: 'Search (Ctrl+K)',
      settings: 'Settings',
      themes: 'Themes',
      editLayout: 'Edit Layout',
      lockLayout: 'Lock Layout',
    },
    settings: {
      title: 'DashFlow Settings',
      general: 'General',
      appearance: 'Appearance',
      layout: 'Layout & Grid',
      widgets: 'Manage Widgets',
      language: 'Language',
      timeFormat: 'Time Format',
      animations: 'Animations & Effects',
    },
    widgets: {
      clock: 'Clock',
      weather: 'Weather',
      search: 'Search',
      bookmarks: 'Bookmarks',
      todo: 'To-Do',
      notes: 'Notes',
      quickLinks: 'Quick Links',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      close: 'Close',
      loading: 'Loading...',
      error: 'An error occurred',
      empty: 'No data',
    },
  },
} as const;

export type TranslationKey =
  | 'app.title'
  | 'app.subtitle'
  | 'toolbar.addWidget'
  | 'toolbar.search'
  | 'toolbar.settings'
  | 'toolbar.themes'
  | 'toolbar.editLayout'
  | 'toolbar.lockLayout'
  | 'settings.title'
  | 'settings.general'
  | 'settings.appearance'
  | 'settings.layout'
  | 'settings.widgets'
  | 'settings.language'
  | 'settings.timeFormat'
  | 'settings.animations'
  | 'widgets.clock'
  | 'widgets.weather'
  | 'widgets.search'
  | 'widgets.bookmarks'
  | 'widgets.todo'
  | 'widgets.notes'
  | 'widgets.quickLinks'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.close'
  | 'common.loading'
  | 'common.error'
  | 'common.empty';

/**
 * Функция локализации строк по ключу
 */
export function getTranslation(lang: SupportedLanguage, key: TranslationKey): string {
  const parts = key.split('.');
  let current: any = translations[lang] || translations.ru;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return key;
    }
  }

  return typeof current === 'string' ? current : key;
}

/**
 * Определение исходного языка браузера
 */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('ru')) return 'ru';
  }
  return 'en';
}
