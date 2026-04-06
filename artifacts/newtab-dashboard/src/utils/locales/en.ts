export interface Translations {
  greet_morning: string;
  greet_afternoon: string;
  greet_evening: string;
  tasks_remaining: (n: number) => string;
  outside_temp: (t: string) => string;
  search_placeholder: string;
  edit_mode_title: string;
  edit_mode_hint: string;
  done: string;
  ctx_edit_mode: string;
  ctx_toggle_theme: string;
  ctx_refresh: string;
  ctx_layout: string;
  ctx_remove_widget: string;
  btn_edit_layout: string;
  btn_exit_edit: string;
  btn_toggle_theme: string;
  btn_add_widget: string;
  btn_settings: string;
  w_clock: string;
  w_weather: string;
  w_quicklinks: string;
  w_tasks: string;
  w_bookmarks: string;
  w_calendar: string;
  w_notes: string;
  weather_api_prompt: string;
  weather_key_label: string;
  weather_key_stored: string;
  weather_key_placeholder: string;
  weather_set_key: string;
  weather_change_key: string;
  weather_get_key: string;
  weather_loading: string;
  weather_retry: string;
  weather_change_key_btn: string;
  weather_search_city: string;
  weather_geo_denied: string;
  weather_city_placeholder: string;
  weather_feels_like: string;
  weather_forecast: string;
  weather_humidity: string;
  weather_wind: string;
  weather_visibility: string;
  weather_save: string;
  weather_cancel: string;
  weather_search_placeholder: string;
  todo_complete: (done: number, total: number) => string;
  todo_filter_all: string;
  todo_filter_active: string;
  todo_filter_done: string;
  todo_placeholder: string;
  todo_empty_done: string;
  todo_empty_all: string;
  todo_tooltip_priority: string;
  todo_tooltip_expand: string;
  todo_tooltip_remove: string;
  todo_new_priority: string;
  settings_bg_custom_color: string;
  priority_low: string;
  priority_medium: string;
  priority_high: string;
  deadline_label: string;
  cal_no_events: string;
  cal_today: string;
  cal_tomorrow: string;
  cal_add: string;
  cal_event_placeholder: string;
  cal_save: string;
  cal_time_optional: string;
  notes_auto_saved: string;
  notes_preview: string;
  notes_edit: string;
  notes_new_note: string;
  notes_title_placeholder: string;
  notes_content_placeholder: string;
  notes_words: string;
  notes_chars: string;
  stat_streak: string;
  stat_focus: string;
  stat_tasks_done: string;
  stat_bookmarks: string;
  stat_streak_value: string;
  stat_focus_value: string;
  settings_title: string;
  settings_close: string;
  settings_appearance: string;
  settings_language: string;
  settings_theme: string;
  settings_theme_dark: string;
  settings_theme_light: string;
  settings_background: string;
  settings_bg_gradient_blue: string;
  settings_bg_gradient_purple: string;
  settings_bg_gradient_green: string;
  settings_bg_solid: string;
  settings_bg_mesh: string;
  settings_search_section: string;
  settings_search_engine: string;
  settings_widgets_section: string;
  settings_weather_city: string;
  settings_weather_units: string;
  settings_celsius: string;
  settings_fahrenheit: string;
  settings_profile: string;
  settings_name: string;
  settings_name_placeholder: string;
  settings_reset: string;
  settings_reset_confirm: string;
  settings_reset_yes: string;
  settings_reset_no: string;
  lang_en: string;
  lang_ru: string;
  search_google: string;
  search_bing: string;
  search_ddg: string;
  search_yandex: string;
  settings_subtitle: string;
  settings_theme_system: string;
  settings_clock_format: string;
  settings_clock_12h: string;
  settings_clock_24h: string;
  settings_clock_seconds: string;
  settings_clock_timezone: string;
  settings_clock_tz_auto: string;
  settings_widgets_no_settings: string;
  notes_empty_preview: string;
  weather_err_invalid_key: string;
  weather_err_city_not_found: string;
  weather_err_too_many: string;
  weather_err_server: string;
  weather_err_generic: string;
  bm_add: string;
  bm_title_placeholder: string;
  bm_url_placeholder: string;
  bm_tag_placeholder: string;
  bm_save: string;
  bm_cancel: string;
  bm_delete: string;
  ql_add: string;
  ql_label_placeholder: string;
  ql_url_placeholder: string;
  ql_icon_placeholder: string;
  ql_save: string;
  ql_cancel: string;
  ql_delete: string;
  bmi_widget_title: string;
  bmi_desc: string;
  bmf_widget_title: string;
  bmf_desc: string;
  bmf_name_placeholder: string;
  bmf_add_link: string;
  bmf_open: string;
  bmf_items: (n: number) => string;
  bm_customize: string;
  bm_color: string;
  bm_url_label: string;
  bm_back: string;
  wm_title: string;
  wm_subtitle: (active: number) => string;
  wm_search_placeholder: string;
  wm_add: string;
  wm_remove: string;
  wm_active: string;
  wm_desc_clock: string;
  wm_desc_weather: string;
  wm_desc_quicklinks: string;
  wm_desc_todo: string;
  wm_desc_bookmarks: string;
  wm_desc_calendar: string;
  wm_desc_notes: string;
  wm_desc_bmi: string;
  wm_desc_bmf: string;
  w_pomodoro: string;
  w_habit: string;
  w_currency: string;
  wm_desc_pomodoro: string;
  wm_desc_habit: string;
  wm_desc_currency: string;
  pomodoro_focus: string;
  pomodoro_break: string;
  pomodoro_longbreak: string;
  pomodoro_start: string;
  pomodoro_pause: string;
  pomodoro_reset: string;
  pomodoro_sessions: (n: number) => string;
  pomodoro_work_dur: string;
  pomodoro_break_dur: string;
  pomodoro_long_dur: string;
  pomodoro_interval: string;
  pomodoro_min: string;
  habit_add_placeholder: string;
  habit_add: string;
  habit_streak: (n: number) => string;
  habit_empty: string;
  currency_base: string;
  currency_amount: string;
  currency_target: string;
  currency_offline: string;
  currency_rates_from: (d: string) => string;
  currency_loading: string;
  currency_error: string;
  currency_retry: string;
  settings_data_section: string;
  settings_export: string;
  settings_export_desc: string;
  settings_import: string;
  settings_import_desc: string;
  settings_import_success: string;
  settings_import_error: string;
  settings_import_invalid: string;
  settings_sync_note: string;
}

export const en: Translations = {
  greet_morning: "Good morning",
  greet_afternoon: "Good afternoon",
  greet_evening: "Good evening",
  tasks_remaining: (n: number) => `${n} task${n !== 1 ? "s" : ""} remaining`,
  outside_temp: (t: string) => `${t} outside`,

  search_placeholder: "Search the web or type a URL...",

  edit_mode_title: "Edit Layout Mode",
  edit_mode_hint: "Drag widget handles to move · Drag corner to resize · Click × to remove",
  done: "Done",

  ctx_edit_mode: "Toggle Edit Mode",
  ctx_toggle_theme: "Toggle Theme",
  ctx_refresh: "Refresh",
  ctx_layout: "Customize Layout",
  ctx_remove_widget: "Remove Widget",

  btn_edit_layout: "Edit Layout",
  btn_exit_edit: "Exit Edit Mode",
  btn_toggle_theme: "Toggle Theme",
  btn_add_widget: "Add Widget",
  btn_settings: "Settings",

  w_clock: "Clock",
  w_weather: "Weather",
  w_quicklinks: "Quick Access",
  w_tasks: "Tasks",
  w_bookmarks: "Recent Bookmarks",
  w_calendar: "Calendar",
  w_notes: "Notes",

  weather_api_prompt: "Enter your OpenWeatherMap API key to see live weather",
  weather_key_label: "OpenWeatherMap API Key",
  weather_key_stored: "Your key is stored locally and never shared.",
  weather_key_placeholder: "Enter API key...",
  weather_set_key: "Set API Key",
  weather_change_key: "Change API key",
  weather_get_key: "Get a free API key →",
  weather_loading: "Fetching weather…",
  weather_retry: "Retry",
  weather_change_key_btn: "Change Key",
  weather_search_city: "Search City",
  weather_geo_denied: "Location access denied — enter a city name.",
  weather_city_placeholder: "e.g. London, Tokyo, New York",
  weather_feels_like: "Feels like",
  weather_forecast: "5-day forecast",
  weather_humidity: "Humidity",
  weather_wind: "Wind",
  weather_visibility: "Visibility",
  weather_save: "Save",
  weather_cancel: "Cancel",
  weather_search_placeholder: "Search city…",

  todo_complete: (done: number, total: number) => `${done} of ${total} complete`,
  todo_filter_all: "All",
  todo_filter_active: "Active",
  todo_filter_done: "Done",
  todo_placeholder: "Add a task… (Enter to save)",
  todo_empty_done: "No completed tasks",
  todo_empty_all: "All caught up!",
  todo_tooltip_priority: "Set priority",
  todo_tooltip_expand: "Set deadline",
  todo_tooltip_remove: "Remove",
  todo_new_priority: "Priority",
  settings_bg_custom_color: "Custom color",
  priority_low: "Low",
  priority_medium: "Medium",
  priority_high: "High",
  deadline_label: "Deadline:",

  cal_no_events: "No upcoming events",
  cal_today: "Today",
  cal_tomorrow: "Tomorrow",
  cal_add: "Add",
  cal_event_placeholder: "Event title…",
  cal_save: "Save",
  cal_time_optional: "(optional time)",

  notes_auto_saved: "Auto-saved",
  notes_preview: "Preview",
  notes_edit: "Edit",
  notes_new_note: "New note",
  notes_title_placeholder: "Note title…",
  notes_content_placeholder: "Start writing... **bold**, `code`, - bullet",
  notes_words: "words",
  notes_chars: "chars",

  stat_streak: "Streak",
  stat_focus: "Focus Time",
  stat_streak_value: "14 days",
  stat_focus_value: "4h 20m",
  stat_tasks_done: "Tasks Done",
  stat_bookmarks: "Bookmarks",

  settings_title: "Settings",
  settings_close: "Close",
  settings_appearance: "Appearance",
  settings_language: "Language",
  settings_theme: "Theme",
  settings_theme_dark: "Dark",
  settings_theme_light: "Light",
  settings_background: "Background",
  settings_bg_gradient_blue: "Ocean Blue",
  settings_bg_gradient_purple: "Violet Dusk",
  settings_bg_gradient_green: "Forest",
  settings_bg_solid: "Solid",
  settings_bg_mesh: "Aurora",
  settings_search_section: "Search",
  settings_search_engine: "Search Engine",
  settings_widgets_section: "Widget Settings",
  settings_weather_city: "Weather City",
  settings_weather_units: "Temperature Unit",
  settings_celsius: "Celsius",
  settings_fahrenheit: "Fahrenheit",
  settings_profile: "Profile",
  settings_name: "Your Name",
  settings_name_placeholder: "Enter your name",
  settings_reset: "Reset to Defaults",
  settings_reset_confirm: "Reset all settings and widget positions?",
  settings_reset_yes: "Reset",
  settings_reset_no: "Cancel",

  lang_en: "English",
  lang_ru: "Русский",

  search_google: "Google",
  search_bing: "Bing",
  search_ddg: "DuckDuckGo",
  search_yandex: "Yandex",

  settings_subtitle: "DashFlow",
  settings_theme_system: "System",
  settings_clock_format: "Time format",
  settings_clock_12h: "12 h",
  settings_clock_24h: "24 h",
  settings_clock_seconds: "Seconds",
  settings_clock_timezone: "Timezone",
  settings_clock_tz_auto: "System",
  settings_widgets_no_settings: "No settings for this widget",
  notes_empty_preview: "Start writing...",
  weather_err_invalid_key: "Invalid API key — please check your OpenWeatherMap key",
  weather_err_city_not_found: "City not found — try a different name",
  weather_err_too_many: "Too many requests — please try again later",
  weather_err_server: "Weather service is temporarily unavailable",
  weather_err_generic: "Weather unavailable",
  bm_add: "+ Add bookmark",
  bm_title_placeholder: "Title…",
  bm_url_placeholder: "https://example.com",
  bm_tag_placeholder: "Tag",
  bm_save: "Add",
  bm_cancel: "Cancel",
  bm_delete: "Delete",
  ql_add: "+ Add link",
  ql_label_placeholder: "Label…",
  ql_url_placeholder: "https://example.com",
  ql_icon_placeholder: "🔗",
  ql_save: "Add",
  ql_cancel: "Cancel",
  ql_delete: "Delete",
  bmi_widget_title: "Bookmark",
  bmi_desc: "Single link icon",
  bmf_widget_title: "Folder",
  bmf_desc: "Group of links",
  bmf_name_placeholder: "Folder name…",
  bmf_add_link: "+ Add link",
  bmf_open: "Open",
  bmf_items: (n) => `${n} link${n !== 1 ? "s" : ""}`,
  bm_customize: "Customize",
  bm_color: "Color",
  bm_url_label: "URL",
  bm_back: "← Back",
  wm_title: "Widget Gallery",
  wm_subtitle: (active) => `${active} widget${active !== 1 ? "s" : ""} active`,
  wm_search_placeholder: "Search widgets…",
  wm_add: "Add",
  wm_remove: "Remove",
  wm_active: "Active",
  wm_desc_clock: "Current time, date and day progress",
  wm_desc_weather: "Live weather with 5-day forecast",
  wm_desc_quicklinks: "Fast access to your favorite sites",
  wm_desc_todo: "Task list with priorities and deadlines",
  wm_desc_bookmarks: "Curated list of saved links",
  wm_desc_calendar: "Upcoming events and date picker",
  wm_desc_notes: "Markdown notes with auto-save",
  wm_desc_bmi: "Single bookmark icon tile",
  wm_desc_bmf: "Folder of grouped bookmarks",
  w_pomodoro: "Pomodoro Timer",
  w_habit: "Habit Tracker",
  w_currency: "Currency Converter",
  wm_desc_pomodoro: "Focus timer with work/break cycles",
  wm_desc_habit: "Daily habits with streak tracking",
  wm_desc_currency: "Live exchange rates for 8 currencies",
  pomodoro_focus: "Focus",
  pomodoro_break: "Short Break",
  pomodoro_longbreak: "Long Break",
  pomodoro_start: "Start",
  pomodoro_pause: "Pause",
  pomodoro_reset: "Reset",
  pomodoro_sessions: (n) => `${n} session${n !== 1 ? "s" : ""} today`,
  pomodoro_work_dur: "Work",
  pomodoro_break_dur: "Break",
  pomodoro_long_dur: "Long Break",
  pomodoro_interval: "Long break every",
  pomodoro_min: "min",
  habit_add_placeholder: "New habit…",
  habit_add: "Add",
  habit_streak: (n) => `${n} day streak`,
  habit_empty: "No habits yet — add your first one!",
  currency_base: "From",
  currency_amount: "Amount",
  currency_target: "To",
  currency_offline: "Offline",
  currency_rates_from: (d) => `Rates from ${d}`,
  currency_loading: "Loading rates…",
  currency_error: "Could not load rates",
  currency_retry: "Retry",
  settings_data_section: "Data & Sync",
  settings_export: "Export backup",
  settings_export_desc: "Download a JSON file with all your dashboard data",
  settings_import: "Import backup",
  settings_import_desc: "Restore from a previously exported JSON file",
  settings_import_success: "Backup imported — reloading…",
  settings_import_error: "Failed to import backup",
  settings_import_invalid: "Invalid or incompatible backup file",
  settings_sync_note: "Settings sync automatically across Chrome on the same Google account.",
};
