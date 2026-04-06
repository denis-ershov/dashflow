// Chrome Storage abstraction with localStorage fallback for Vite dev mode

function hasChromeStorage(): boolean {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.storage !== "undefined" &&
    typeof chrome.storage.local !== "undefined"
  );
}

function hasChromeSync(): boolean {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.storage !== "undefined" &&
    typeof chrome.storage.sync !== "undefined"
  );
}

// ─── LOCAL (bulk data: layouts, todos, quicklinks, bookmarks) ────────────────

export async function getLocal<T>(key: string, defaultValue: T): Promise<T> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          resolve(defaultValue);
          return;
        }
        const val = result[key];
        resolve(val !== undefined ? (val as T) : defaultValue);
      });
    });
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export async function setLocal<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ─── SYNC (settings: theme, preferences) ────────────────────────────────────

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  if (hasChromeSync()) {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) {
          resolve(defaultValue);
          return;
        }
        const val = result[key];
        resolve(val !== undefined ? (val as T) : defaultValue);
      });
    });
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  if (hasChromeSync()) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, () => {
        resolve();
      });
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ─── KEYS ────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  layouts: "newtab_layouts",
  todos: "newtab_todos",
  theme: "newtab_theme",
  quicklinks: "newtab_quicklinks",
  bookmarks: "newtab_bookmarks",
  bookmarkItems: "newtab_bookmark_items",
  weatherApiKey: "newtab_weather_key",
  weatherCity: "newtab_weather_city",
  weatherUnit: "newtab_weather_unit",
  calendar: "newtab_calendar",
  notes: "newtab_notes",
  settings: "newtab_settings",
  pomodoro: "newtab_pomodoro",
  habits: "newtab_habits",
  currency: "newtab_currency",
  gridSchemaVersion: "newtab_grid_schema_v",
} as const;

// ─── DEBOUNCE UTILITY ────────────────────────────────────────────────────────

export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, ms);
  };
}
