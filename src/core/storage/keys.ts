/**
 * Типизированный реестр ключей локального хранилища DashFlow
 */
export const STORAGE_KEYS = {
  /** Основное состояние сетки, инстансов виджетов и раскладок */
  DASHBOARD: 'dashflow_dashboard_store',
  /** Резервная копия состояния v1 для безопасного отката (Правило 51) */
  DASHBOARD_BACKUP_V1: 'dashflow_backup_v1',
  /** Состояние темы и внешнего вида */
  THEME: 'dashflow_theme_store',
  /** Резервная копия темы v1 */
  THEME_BACKUP_V1: 'dashflow_theme_backup_v1',
  /** Общие настройки приложения (язык, анимации, масштаб) */
  APP_SETTINGS: 'dashflow_app_settings',
  /** Пользовательские обои (IndexedDB) */
  WALLPAPER_BLOB: 'dashflow_wallpaper_blob',
  /** Кеш прогноза погоды (IndexedDB) */
  WEATHER_CACHE: 'dashflow_weather_cache',
  /** Данные виджета Todo */
  TODO_ITEMS: 'dashflow_widget_todo_items',
  /** Данные виджета Заметок */
  NOTES_CONTENT: 'dashflow_widget_notes_content',
  /** Данные виджета Быстрых Ссылок */
  QUICK_LINKS: 'dashflow_widget_quick_links',
  /** Состояние виджета Помодоро */
  POMODORO_STATE: 'dashflow_widget_pomodoro_state',
  /** Пользовательские декларативные плагины */
  CUSTOM_PLUGINS: 'dashflow_custom_plugins',
  /** Предоставленные права доступа для виджетов и плагинов */
  PERMISSION_GRANTS: 'dashflow_permission_grants',
  /** Префикс данных плагинов */
  PLUGIN_DATA_PREFIX: 'dashflow_plugin_',
} as const;

export type KnownStorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type StorageKey = KnownStorageKey | (string & {});
