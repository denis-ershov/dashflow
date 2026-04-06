import { create } from "zustand";
import { getLocal, setLocal, getSetting, setSetting, STORAGE_KEYS, debounce } from "../../store/storage";

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
  title: string;
}

// ─── COLLISION RESOLUTION ─────────────────────────────────────────────────────

export function resolveCollisions(layouts: WidgetLayout[], pinnedId: string): WidgetLayout[] {
  const result = layouts.map(l => ({ ...l }));

  function overlaps(a: WidgetLayout, b: WidgetLayout): boolean {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x &&
      a.y < b.y + b.h && a.y + a.h > b.y
    );
  }

  for (let pass = 0; pass < 30; pass++) {
    result.sort((a, b) => {
      if (a.id === pinnedId) return -1;
      if (b.id === pinnedId) return 1;
      return a.y !== b.y ? a.y - b.y : a.x - b.x;
    });

    let changed = false;
    for (let i = 1; i < result.length; i++) {
      let maxY = result[i].y;
      for (let j = 0; j < i; j++) {
        if (overlaps(result[i], result[j])) {
          maxY = Math.max(maxY, result[j].y + result[j].h);
        }
      }
      if (maxY > result[i].y) {
        result[i] = { ...result[i], y: maxY };
        changed = true;
      }
    }
    if (!changed) break;
  }

  return result;
}

interface GridStore {
  layouts: WidgetLayout[];
  hydrated: boolean;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  toggleEditMode: () => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, w: number, h: number) => void;
  removeWidget: (id: string) => void;
  addWidget: (layout: WidgetLayout) => void;
  setLayouts: (layouts: WidgetLayout[]) => void;
  resetLayouts: () => void;
  loadLayouts: () => Promise<void>;
}

export const INITIAL_LAYOUTS: WidgetLayout[] = [
  { id: "clock",      x: 0,  y: 0,  w: 6,  h: 5,  minW: 4, minH: 4, maxW: 9,  maxH: 8,  title: "Clock" },
  { id: "weather",    x: 6,  y: 0,  w: 6,  h: 5,  minW: 4, minH: 4, maxW: 11, maxH: 8,  title: "Weather" },
  { id: "quicklinks", x: 12, y: 0,  w: 6,  h: 5,  minW: 4, minH: 4, maxW: 9,  maxH: 8,  title: "Quick Access" },
  { id: "todo",       x: 0,  y: 5,  w: 12, h: 6,  minW: 5, minH: 5, maxW: 18, maxH: 9,  title: "Tasks" },
  { id: "bookmarks",  x: 12, y: 5,  w: 6,  h: 6,  minW: 4, minH: 5, maxW: 9,  maxH: 9,  title: "Bookmarks" },
  { id: "calendar",   x: 0,  y: 11, w: 8,  h: 9,  minW: 5, minH: 6, maxW: 12, maxH: 13, title: "Calendar" },
  { id: "notes",      x: 8,  y: 11, w: 10, h: 9,  minW: 5, minH: 5, maxW: 18, maxH: 13, title: "Notes" },
];

const saveLayouts = debounce((layouts: WidgetLayout[]) => {
  setLocal(STORAGE_KEYS.layouts, layouts);
}, 300);

export const useGridStore = create<GridStore>()((set) => ({
  layouts: INITIAL_LAYOUTS,
  hydrated: false,
  editMode: false,
  setEditMode: (v) => set({ editMode: v }),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  moveWidget: (id, x, y) =>
    set((s) => {
      const layouts = resolveCollisions(
        s.layouts.map((l) => (l.id === id ? { ...l, x, y } : l)),
        id,
      );
      saveLayouts(layouts);
      return { layouts };
    }),
  resizeWidget: (id, w, h) =>
    set((s) => {
      const layouts = resolveCollisions(
        s.layouts.map((l) => (l.id === id ? { ...l, w, h } : l)),
        id,
      );
      saveLayouts(layouts);
      return { layouts };
    }),
  removeWidget: (id) =>
    set((s) => {
      const layouts = s.layouts.filter((l) => l.id !== id);
      saveLayouts(layouts);
      return { layouts };
    }),
  addWidget: (layout) =>
    set((s) => {
      if (s.layouts.some((l) => l.id === layout.id)) return s;
      const layouts = resolveCollisions([...s.layouts, layout], layout.id);
      saveLayouts(layouts);
      return { layouts };
    }),
  setLayouts: (layouts) =>
    set(() => {
      saveLayouts(layouts);
      return { layouts };
    }),
  resetLayouts: () =>
    set(() => {
      setLocal(STORAGE_KEYS.layouts, INITIAL_LAYOUTS);
      return { layouts: INITIAL_LAYOUTS };
    }),
  loadLayouts: async () => {
    const SCHEMA_V = 3;
    const saved = await getLocal<WidgetLayout[] | null>(STORAGE_KEYS.layouts, null);
    if (saved === null) {
      setLocal(STORAGE_KEYS.layouts, INITIAL_LAYOUTS);
      setLocal(STORAGE_KEYS.gridSchemaVersion, SCHEMA_V);
      set({ layouts: INITIAL_LAYOUTS, hydrated: true });
    } else {
      const schemaV = await getLocal<number>(STORAGE_KEYS.gridSchemaVersion, 0);
      const savedIds = new Set(saved.map((l) => l.id));
      const newDefaults = INITIAL_LAYOUTS.filter((l) => !savedIds.has(l.id));
      const raw = [...saved, ...newDefaults];

      // v2: ROW_H 88→64, unitH 104→80 — scale y/h by 104/80
      const v2H = (n: number) => Math.max(1, Math.round(n * 104 / 80));
      // v3: COLS 12→18, GAP 16→12, ROW_H 64→52
      //   x/w scale by 18/12 = 1.5   |   y/h scale by (64+16)/(52+12) = 80/64 = 1.25

      const migrated = raw.map((l) => {
        const isBmi = l.id.startsWith("bmi_");
        const isBmf = l.id.startsWith("bmf_");

        // Compute the intermediate v2 values (for any schemaV < 2 saves)
        let m = { ...l };
        if (schemaV < 2 && !isBmi && !isBmf) {
          m = { ...m, y: v2H(m.y), h: v2H(m.h), minH: v2H(m.minH), maxH: v2H(m.maxH) };
        }

        // v3: scale positions/sizes to new 18-col grid for all widgets
        if (schemaV < 3) {
          m = {
            ...m,
            x: Math.round(m.x * 1.5),
            w: Math.max(1, Math.round(m.w * 1.5)),
            y: Math.round(m.y * 1.25),
            h: Math.max(1, Math.round(m.h * 1.25)),
          };
          if (!isBmi && !isBmf) {
            m = {
              ...m,
              minW: Math.max(1, Math.round(m.minW * 1.5)),
              maxW: Math.round(m.maxW * 1.5),
              minH: Math.max(1, Math.round(m.minH * 1.25)),
              maxH: Math.round(m.maxH * 1.25),
            };
          }
        }

        // Always enforce bmi/bmf constraints
        if (isBmi) return { ...m, minW: 1, minH: 1, maxW: Math.max(m.maxW ?? 6, 6) };
        if (isBmf) return { ...m, minW: 1, minH: 1, maxW: Math.max(m.maxW ?? 9, 9) };
        return m;
      });

      setLocal(STORAGE_KEYS.layouts, migrated);
      setLocal(STORAGE_KEYS.gridSchemaVersion, SCHEMA_V);
      set({ layouts: migrated, hydrated: true });
    }
  },
}));

// ─── THEME STORE ─────────────────────────────────────────────────────────────

export type ThemeMode = "dark" | "light" | "system";

function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") {
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  }
  return mode;
}

interface ThemeStore {
  theme: "dark" | "light";
  themeMode: ThemeMode;
  hydrated: boolean;
  toggle: () => void;
  setThemeMode: (m: ThemeMode) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  theme: "dark",
  themeMode: "dark",
  hydrated: false,
  toggle: () => {
    const { themeMode } = get();
    const next: ThemeMode = themeMode === "dark" ? "light" : "dark";
    set({ themeMode: next, theme: next });
    setSetting(STORAGE_KEYS.theme, next);
  },
  setThemeMode: (mode) => {
    const theme = resolveTheme(mode);
    set({ themeMode: mode, theme });
    setSetting(STORAGE_KEYS.theme, mode);
  },
  loadTheme: async () => {
    const saved = await getSetting<ThemeMode>(STORAGE_KEYS.theme, "dark");
    set({ themeMode: saved, theme: resolveTheme(saved), hydrated: true });
  },
}));

// ─── TODO STORE ───────────────────────────────────────────────────────────────

export type TodoPriority = "low" | "medium" | "high";

export interface TodoItem {
  id: number;
  text: string;
  done: boolean;
  priority?: TodoPriority;
  deadline?: string;
  order: number;
}

interface TodoStore {
  todos: TodoItem[];
  hydrated: boolean;
  toggle: (id: number) => void;
  add: (text: string, priority?: TodoPriority) => void;
  remove: (id: number) => void;
  setPriority: (id: number, priority: TodoPriority | undefined) => void;
  setDeadline: (id: number, deadline: string | undefined) => void;
  reorder: (activeId: number, overId: number) => void;
  loadTodos: () => Promise<void>;
}

const INIT_TODOS: TodoItem[] = [
  { id: 1, text: "Review pull requests",      done: true,  priority: "medium", order: 0 },
  { id: 2, text: "Update design system docs",  done: false, priority: "high",   order: 1 },
  { id: 3, text: "Schedule team standup",      done: false, priority: "low",    order: 2 },
  { id: 4, text: "Deploy v2.4 to staging",     done: false, priority: "high",   order: 3 },
  { id: 5, text: "Refactor auth module",       done: true,  priority: "medium", order: 4 },
];

const saveTodos = debounce((todos: TodoItem[]) => {
  setLocal(STORAGE_KEYS.todos, todos);
}, 300);

export const useTodoStore = create<TodoStore>()((set) => ({
  todos: INIT_TODOS,
  hydrated: false,
  toggle: (id) =>
    set((s) => {
      const todos = s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      saveTodos(todos);
      return { todos };
    }),
  add: (text, priority) =>
    set((s) => {
      const maxOrder = s.todos.reduce((m, t) => Math.max(m, t.order), -1);
      const todos = [...s.todos, { id: Date.now(), text, done: false, priority, order: maxOrder + 1 }];
      saveTodos(todos);
      return { todos };
    }),
  remove: (id) =>
    set((s) => {
      const todos = s.todos.filter((t) => t.id !== id);
      saveTodos(todos);
      return { todos };
    }),
  setPriority: (id, priority) =>
    set((s) => {
      const todos = s.todos.map((t) => (t.id === id ? { ...t, priority } : t));
      saveTodos(todos);
      return { todos };
    }),
  setDeadline: (id, deadline) =>
    set((s) => {
      const todos = s.todos.map((t) => (t.id === id ? { ...t, deadline } : t));
      saveTodos(todos);
      return { todos };
    }),
  reorder: (activeId, overId) =>
    set((s) => {
      const sorted = [...s.todos].sort((a, b) => a.order - b.order);
      const fromIdx = sorted.findIndex((t) => t.id === activeId);
      const toIdx = sorted.findIndex((t) => t.id === overId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return s;
      const moved = sorted.splice(fromIdx, 1)[0];
      sorted.splice(toIdx, 0, moved);
      const todos = sorted.map((t, i) => ({ ...t, order: i }));
      saveTodos(todos);
      return { todos };
    }),
  loadTodos: async () => {
    const saved = await getLocal<TodoItem[]>(STORAGE_KEYS.todos, INIT_TODOS);
    // Migrate older items that lack `order`
    const migrated = saved.map((t, i) => ({ ...t, order: t.order ?? i }));
    set({ todos: migrated, hydrated: true });
  },
}));

// ─── QUICK LINKS STORE ────────────────────────────────────────────────────────

export interface QuickLink {
  label: string;
  icon: string;
  glow: string;
  href: string;
}

interface QuickLinksStore {
  links: QuickLink[];
  hydrated: boolean;
  add: (link: QuickLink) => void;
  remove: (href: string) => void;
  loadLinks: () => Promise<void>;
}

export const DEFAULT_LINKS: QuickLink[] = [
  { label: "GitHub", icon: "🐙", glow: "rgba(139,92,246,0.3)", href: "https://github.com" },
  { label: "Figma",  icon: "🎨", glow: "rgba(242,78,30,0.3)",  href: "https://figma.com" },
  { label: "Notion", icon: "📝", glow: "rgba(200,200,200,0.2)", href: "https://notion.so" },
  { label: "Linear", icon: "📋", glow: "rgba(94,106,210,0.3)",  href: "https://linear.app" },
  { label: "Vercel", icon: "▲",  glow: "rgba(200,200,200,0.2)", href: "https://vercel.com" },
  { label: "Slack",  icon: "💬", glow: "rgba(74,21,75,0.3)",   href: "https://slack.com" },
];

const saveLinks = debounce((links: QuickLink[]) => {
  setLocal(STORAGE_KEYS.quicklinks, links);
}, 300);

export const useQuickLinksStore = create<QuickLinksStore>()((set) => ({
  links: DEFAULT_LINKS,
  hydrated: false,
  add: (link) =>
    set((s) => {
      const links = [...s.links, link];
      saveLinks(links);
      return { links };
    }),
  remove: (href) =>
    set((s) => {
      const links = s.links.filter((l) => l.href !== href);
      saveLinks(links);
      return { links };
    }),
  loadLinks: async () => {
    const saved = await getLocal<QuickLink[]>(STORAGE_KEYS.quicklinks, DEFAULT_LINKS);
    set({ links: saved, hydrated: true });
  },
}));

// ─── BOOKMARKS STORE ──────────────────────────────────────────────────────────

export interface BookmarkItem {
  title: string;
  url: string;
  tag: string;
  tc: string;
  href: string;
}

interface BookmarksStore {
  bookmarks: BookmarkItem[];
  hydrated: boolean;
  add: (bm: BookmarkItem) => void;
  remove: (href: string) => void;
  loadBookmarks: () => Promise<void>;
}

export const DEFAULT_BOOKMARKS: BookmarkItem[] = [
  { title: "Framer Motion Docs", url: "framer.com/motion",   tag: "Dev",     tc: "#007CC7", href: "https://www.framer.com/motion/" },
  { title: "Linear Changelog",   url: "linear.app/changelog", tag: "Product", tc: "#8b5cf6", href: "https://linear.app/changelog" },
  { title: "Raycast Extensions", url: "raycast.com/store",   tag: "Tools",   tc: "#f59e0b", href: "https://www.raycast.com/store" },
  { title: "Tailwind v4 Alpha",  url: "tailwindcss.com",     tag: "Dev",     tc: "#007CC7", href: "https://tailwindcss.com" },
  { title: "Arc Browser Blog",   url: "arc.net/blog",        tag: "Design",  tc: "#ec4899", href: "https://arc.net/blog" },
];

const saveBookmarks = debounce((bookmarks: BookmarkItem[]) => {
  setLocal(STORAGE_KEYS.bookmarks, bookmarks);
}, 300);

export const useBookmarksStore = create<BookmarksStore>()((set) => ({
  bookmarks: DEFAULT_BOOKMARKS,
  hydrated: false,
  add: (bm) =>
    set((s) => {
      const bookmarks = [...s.bookmarks, bm];
      saveBookmarks(bookmarks);
      return { bookmarks };
    }),
  remove: (href) =>
    set((s) => {
      const bookmarks = s.bookmarks.filter((b) => b.href !== href);
      saveBookmarks(bookmarks);
      return { bookmarks };
    }),
  loadBookmarks: async () => {
    const saved = await getLocal<BookmarkItem[]>(STORAGE_KEYS.bookmarks, DEFAULT_BOOKMARKS);
    set({ bookmarks: saved, hydrated: true });
  },
}));

// ─── CALENDAR STORE ───────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time?: string;
}

interface CalendarStore {
  events: CalendarEvent[];
  hydrated: boolean;
  addEvent: (ev: Omit<CalendarEvent, "id">) => void;
  removeEvent: (id: number) => void;
  loadEvents: () => Promise<void>;
}

const INIT_EVENTS: CalendarEvent[] = [
  { id: 1, title: "Team Standup",    date: new Date().toISOString().slice(0, 10), time: "09:00" },
  { id: 2, title: "Design Review",   date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: "14:00" },
  { id: 3, title: "Sprint Planning", date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), time: "10:00" },
];

const saveEvents = debounce((events: CalendarEvent[]) => {
  setLocal(STORAGE_KEYS.calendar, events);
}, 300);

export const useCalendarStore = create<CalendarStore>()((set) => ({
  events: INIT_EVENTS,
  hydrated: false,
  addEvent: (ev) =>
    set((s) => {
      const events = [...s.events, { ...ev, id: Date.now() }];
      saveEvents(events);
      return { events };
    }),
  removeEvent: (id) =>
    set((s) => {
      const events = s.events.filter((e) => e.id !== id);
      saveEvents(events);
      return { events };
    }),
  loadEvents: async () => {
    const saved = await getLocal<CalendarEvent[]>(STORAGE_KEYS.calendar, INIT_EVENTS);
    set({ events: saved, hydrated: true });
  },
}));

// ─── NOTES STORE ──────────────────────────────────────────────────────────────

export interface Note {
  id: number;
  title: string;
  content: string;
}

interface NotesStore {
  notes: Note[];
  activeNoteId: number;
  hydrated: boolean;
  addNote: () => void;
  removeNote: (id: number) => void;
  updateNote: (id: number, patch: Partial<Pick<Note, "title" | "content">>) => void;
  setActiveNote: (id: number) => void;
  loadNotes: () => Promise<void>;
}

const INIT_NOTES: Note[] = [
  { id: 1, title: "Quick notes", content: "Start writing here...\n\n**Bold text** example\n`inline code` example\n- Bullet point" },
];

interface PersistedNotes { notes: Note[]; activeNoteId: number }

const saveNotes = debounce((state: PersistedNotes) => {
  setLocal(STORAGE_KEYS.notes, state);
}, 500);

export const useNotesStore = create<NotesStore>()((set) => ({
  notes: INIT_NOTES,
  activeNoteId: 1,
  hydrated: false,
  addNote: () =>
    set((s) => {
      if (s.notes.length >= 5) return s;
      const id = Date.now();
      const notes = [...s.notes, { id, title: "New note", content: "" }];
      saveNotes({ notes, activeNoteId: id });
      return { notes, activeNoteId: id };
    }),
  removeNote: (id) =>
    set((s) => {
      if (s.notes.length <= 1) return s;
      const notes = s.notes.filter((n) => n.id !== id);
      const activeNoteId = s.activeNoteId === id
        ? (notes[0]?.id ?? 1)
        : s.activeNoteId;
      saveNotes({ notes, activeNoteId });
      return { notes, activeNoteId };
    }),
  updateNote: (id, patch) =>
    set((s) => {
      const notes = s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n));
      saveNotes({ notes, activeNoteId: s.activeNoteId });
      return { notes };
    }),
  setActiveNote: (id) =>
    set((s) => {
      saveNotes({ notes: s.notes, activeNoteId: id });
      return { activeNoteId: id };
    }),
  loadNotes: async () => {
    const saved = await getLocal<PersistedNotes | null>(STORAGE_KEYS.notes, null);
    if (saved === null || !Array.isArray(saved.notes)) {
      set({ notes: INIT_NOTES, activeNoteId: INIT_NOTES[0].id, hydrated: true });
    } else {
      set({ notes: saved.notes, activeNoteId: saved.activeNoteId ?? saved.notes[0]?.id ?? 1, hydrated: true });
    }
  },
}));

// ─── SETTINGS STORE ───────────────────────────────────────────────────────────

export type Language = "en" | "ru";
export type SearchEngine = "google" | "bing" | "ddg" | "yandex";
export type BackgroundStyle = "gradient-blue" | "gradient-purple" | "gradient-green" | "solid" | "mesh";
export type ClockFormat = "12h" | "24h";
export type WeatherUnit = "C" | "F";

export interface AppSettings {
  language: Language;
  searchEngine: SearchEngine;
  backgroundStyle: BackgroundStyle;
  customBgColor: string;
  userName: string;
  weatherCity: string;
  weatherUnit: WeatherUnit;
  clockFormat: ClockFormat;
  clockSeconds: boolean;
  clockTimezone: string;
}

interface SettingsStore extends AppSettings {
  hydrated: boolean;
  setLanguage: (l: Language) => void;
  setSearchEngine: (e: SearchEngine) => void;
  setBackgroundStyle: (b: BackgroundStyle) => void;
  setCustomBgColor: (color: string) => void;
  setUserName: (n: string) => void;
  setWeatherCity: (c: string) => void;
  setWeatherUnit: (u: WeatherUnit) => void;
  setClockFormat: (f: ClockFormat) => void;
  setClockSeconds: (v: boolean) => void;
  setClockTimezone: (tz: string) => void;
  loadSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  searchEngine: "google",
  backgroundStyle: "gradient-blue",
  customBgColor: "#1a2332",
  userName: "Alex",
  weatherCity: "",
  weatherUnit: "C",
  clockFormat: "12h",
  clockSeconds: true,
  clockTimezone: "auto",
};

const saveSettings = debounce((s: AppSettings) => {
  setSetting(STORAGE_KEYS.settings, s);
}, 200);

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  setLanguage: (language) => {
    set({ language });
    saveSettings({ ...get(), language });
  },
  setSearchEngine: (searchEngine) => {
    set({ searchEngine });
    saveSettings({ ...get(), searchEngine });
  },
  setBackgroundStyle: (backgroundStyle) => {
    set({ backgroundStyle });
    saveSettings({ ...get(), backgroundStyle });
  },
  setCustomBgColor: (customBgColor) => {
    set({ customBgColor });
    saveSettings({ ...get(), customBgColor });
  },
  setUserName: (userName) => {
    set({ userName });
    saveSettings({ ...get(), userName });
  },
  setWeatherCity: (weatherCity) => {
    set({ weatherCity });
    saveSettings({ ...get(), weatherCity });
    setSetting(STORAGE_KEYS.weatherCity, weatherCity);
  },
  setWeatherUnit: (weatherUnit) => {
    set({ weatherUnit });
    saveSettings({ ...get(), weatherUnit });
    setSetting(STORAGE_KEYS.weatherUnit, weatherUnit);
  },
  setClockFormat: (clockFormat) => {
    set({ clockFormat });
    saveSettings({ ...get(), clockFormat });
  },
  setClockSeconds: (clockSeconds) => {
    set({ clockSeconds });
    saveSettings({ ...get(), clockSeconds });
  },
  setClockTimezone: (clockTimezone) => {
    set({ clockTimezone });
    saveSettings({ ...get(), clockTimezone });
  },
  loadSettings: async () => {
    let saved = await getSetting<Partial<AppSettings> | null>(STORAGE_KEYS.settings, null);
    if (saved === null) {
      // One-time migration: if settings exist only in local storage (pre-sync upgrade),
      // copy them to sync storage so existing users don't lose their preferences.
      const localSaved = await getLocal<Partial<AppSettings> | null>(STORAGE_KEYS.settings, null);
      if (localSaved !== null) {
        saved = localSaved;
        setSetting(STORAGE_KEYS.settings, localSaved);
      } else {
        const detectedLang: Language = (navigator.language ?? "").toLowerCase().startsWith("ru") ? "ru" : "en";
        const initial = { ...DEFAULT_SETTINGS, language: detectedLang };
        set({ ...initial, hydrated: true });
        setSetting(STORAGE_KEYS.settings, initial);
        return;
      }
    }
    set({ ...DEFAULT_SETTINGS, ...saved, hydrated: true });
  },
  resetToDefaults: async () => {
    const detectedLang: Language = (navigator.language ?? "").toLowerCase().startsWith("ru") ? "ru" : "en";
    const initial = { ...DEFAULT_SETTINGS, language: detectedLang };
    set({ ...initial });
    setSetting(STORAGE_KEYS.settings, initial);
    setLocal(STORAGE_KEYS.layouts, INITIAL_LAYOUTS);
    setSetting(STORAGE_KEYS.weatherCity, "");
    setSetting(STORAGE_KEYS.weatherUnit, "C");
    useThemeStore.setState({ theme: "dark", themeMode: "dark" });
    setSetting(STORAGE_KEYS.theme, "dark");
  },
}));

// ─── POMODORO STORE ───────────────────────────────────────────────────────────

interface PomodoroPersistedData {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  sessionCount: number;
  lastResetDate: string;
}

export type PomodoroPhase = "focus" | "break" | "longbreak";

interface PomodoroStore extends PomodoroPersistedData {
  hydrated: boolean;
  phase: PomodoroPhase;
  secondsLeft: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  advancePhase: () => void;
  setWorkDuration: (m: number) => void;
  setBreakDuration: (m: number) => void;
  setLongBreakDuration: (m: number) => void;
  setLongBreakInterval: (n: number) => void;
  loadPomodoro: () => Promise<void>;
}

const DEFAULT_POMODORO: PomodoroPersistedData = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  sessionCount: 0,
  lastResetDate: new Date().toISOString().slice(0, 10),
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

const savePomodoroSettings = debounce((data: PomodoroPersistedData) => {
  setLocal(STORAGE_KEYS.pomodoro, data);
}, 300);

function getPomodoroPersistedData(s: PomodoroStore): PomodoroPersistedData {
  return {
    workDuration: s.workDuration,
    breakDuration: s.breakDuration,
    longBreakDuration: s.longBreakDuration,
    longBreakInterval: s.longBreakInterval,
    sessionCount: s.sessionCount,
    lastResetDate: s.lastResetDate,
  };
}

export const usePomodoroStore = create<PomodoroStore>()((set, get) => ({
  ...DEFAULT_POMODORO,
  hydrated: false,
  phase: "focus",
  secondsLeft: DEFAULT_POMODORO.workDuration * 60,
  running: false,

  start: () => set({ running: true }),
  pause: () => set({ running: false }),
  reset: () => {
    const s = get();
    const secs = s.phase === "focus" ? s.workDuration * 60
      : s.phase === "longbreak" ? s.longBreakDuration * 60
      : s.breakDuration * 60;
    set({ running: false, secondsLeft: secs });
  },

  tick: () => {
    const s = get();
    if (!s.running) return;
    if (s.secondsLeft > 0) {
      set({ secondsLeft: s.secondsLeft - 1 });
    } else {
      get().advancePhase();
    }
  },

  advancePhase: () => {
    const s = get();
    let sessionCount = s.sessionCount;
    let newPhase: PomodoroPhase;
    let today = todayStr();

    if (s.phase === "focus") {
      sessionCount = s.lastResetDate === today ? s.sessionCount + 1 : 1;
      const lastResetDate = today;
      const isLongBreak = sessionCount % s.longBreakInterval === 0;
      newPhase = isLongBreak ? "longbreak" : "break";
      const secs = isLongBreak ? s.longBreakDuration * 60 : s.breakDuration * 60;
      const persisted: PomodoroPersistedData = {
        ...getPomodoroPersistedData(s), sessionCount, lastResetDate,
      };
      savePomodoroSettings(persisted);
      set({ phase: newPhase, secondsLeft: secs, running: false, sessionCount, lastResetDate });
    } else {
      newPhase = "focus";
      set({ phase: newPhase, secondsLeft: s.workDuration * 60, running: false });
    }
  },

  setWorkDuration: (m) => {
    const s = get();
    const isActive = s.phase === "focus";
    set({ workDuration: m, ...(isActive ? { secondsLeft: m * 60, running: false } : {}) });
    savePomodoroSettings({ ...getPomodoroPersistedData(s), workDuration: m });
  },
  setBreakDuration: (m) => {
    const s = get();
    const isActive = s.phase === "break";
    set({ breakDuration: m, ...(isActive ? { secondsLeft: m * 60, running: false } : {}) });
    savePomodoroSettings({ ...getPomodoroPersistedData(s), breakDuration: m });
  },
  setLongBreakDuration: (m) => {
    const s = get();
    const isActive = s.phase === "longbreak";
    set({ longBreakDuration: m, ...(isActive ? { secondsLeft: m * 60, running: false } : {}) });
    savePomodoroSettings({ ...getPomodoroPersistedData(s), longBreakDuration: m });
  },
  setLongBreakInterval: (n) => {
    const s = get();
    set({ longBreakInterval: n });
    savePomodoroSettings({ ...getPomodoroPersistedData(s), longBreakInterval: n });
  },

  loadPomodoro: async () => {
    const saved = await getLocal<Partial<PomodoroPersistedData> | null>(STORAGE_KEYS.pomodoro, null);
    const data = { ...DEFAULT_POMODORO, ...(saved ?? {}) };
    const today = todayStr();
    if (data.lastResetDate !== today) {
      data.sessionCount = 0;
      data.lastResetDate = today;
    }
    set({ ...data, hydrated: true, phase: "focus", secondsLeft: data.workDuration * 60, running: false });
  },
}));

// ─── HABIT STORE ──────────────────────────────────────────────────────────────

export interface Habit {
  id: number;
  label: string;
  completions: string[];
}

interface HabitStore {
  habits: Habit[];
  hydrated: boolean;
  addHabit: (label: string) => void;
  removeHabit: (id: number) => void;
  toggleToday: (id: number) => void;
  loadHabits: () => Promise<void>;
}

const INIT_HABITS: Habit[] = [
  { id: 1, label: "Meditate", completions: [] },
  { id: 2, label: "Exercise", completions: [] },
  { id: 3, label: "Read", completions: [] },
];

const saveHabits = debounce((habits: Habit[]) => {
  setLocal(STORAGE_KEYS.habits, habits);
}, 300);

export const useHabitStore = create<HabitStore>()((set) => ({
  habits: INIT_HABITS,
  hydrated: false,
  addHabit: (label) =>
    set((s) => {
      const habits = [...s.habits, { id: Date.now(), label, completions: [] }];
      saveHabits(habits);
      return { habits };
    }),
  removeHabit: (id) =>
    set((s) => {
      const habits = s.habits.filter((h) => h.id !== id);
      saveHabits(habits);
      return { habits };
    }),
  toggleToday: (id) =>
    set((s) => {
      const today = todayStr();
      const habits = s.habits.map((h) => {
        if (h.id !== id) return h;
        const done = h.completions.includes(today);
        return {
          ...h,
          completions: done
            ? h.completions.filter((d) => d !== today)
            : [...h.completions, today],
        };
      });
      saveHabits(habits);
      return { habits };
    }),
  loadHabits: async () => {
    const saved = await getLocal<Habit[]>(STORAGE_KEYS.habits, INIT_HABITS);
    set({ habits: saved, hydrated: true });
  },
}));

// ─── CURRENCY STORE ───────────────────────────────────────────────────────────

interface CurrencyPersistedData {
  base: string;
  amount: string;
  targets: [string, string, string];
  rates: Record<string, number> | null;
  ratesBase: string | null;
  ratesTimestamp: number | null;
}

interface CurrencyStore extends CurrencyPersistedData {
  hydrated: boolean;
  loading: boolean;
  fetchError: boolean;
  setBase: (b: string) => void;
  setAmount: (a: string) => void;
  setTarget: (idx: 0 | 1 | 2, currency: string) => void;
  fetchRates: (base?: string) => Promise<void>;
  loadCurrency: () => Promise<void>;
}

const DEFAULT_CURRENCY: CurrencyPersistedData = {
  base: "USD",
  amount: "1",
  targets: ["EUR", "GBP", "RUB"],
  rates: null,
  ratesBase: null,
  ratesTimestamp: null,
};

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const saveCurrency = debounce((data: CurrencyPersistedData) => {
  setLocal(STORAGE_KEYS.currency, data);
}, 300);

function getCurrencyPersistedData(s: CurrencyStore): CurrencyPersistedData {
  return {
    base: s.base, amount: s.amount, targets: s.targets,
    rates: s.rates, ratesBase: s.ratesBase, ratesTimestamp: s.ratesTimestamp,
  };
}

export const useCurrencyStore = create<CurrencyStore>()((set, get) => ({
  ...DEFAULT_CURRENCY,
  hydrated: false,
  loading: false,
  fetchError: false,

  setBase: (base) => {
    set({ base, rates: null, ratesBase: null, ratesTimestamp: null });
    saveCurrency({ ...getCurrencyPersistedData(get()), base, rates: null, ratesBase: null, ratesTimestamp: null });
  },
  setAmount: (amount) => {
    set({ amount });
    saveCurrency({ ...getCurrencyPersistedData(get()), amount });
  },
  setTarget: (idx, currency) => {
    const targets = [...get().targets] as [string, string, string];
    targets[idx] = currency;
    set({ targets });
    saveCurrency({ ...getCurrencyPersistedData(get()), targets });
  },

  fetchRates: async (forcedBase?: string) => {
    const s = get();
    const base = forcedBase ?? s.base;
    const now = Date.now();
    if (
      !forcedBase &&
      s.rates !== null &&
      s.ratesBase === base &&
      s.ratesTimestamp !== null &&
      now - s.ratesTimestamp < SIX_HOURS_MS
    ) return;
    set({ loading: true, fetchError: false });
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json() as { result: string; rates: Record<string, number> };
      if (json.result !== "success") throw new Error("api error");
      const rates = json.rates;
      const persisted: CurrencyPersistedData = {
        ...getCurrencyPersistedData(get()),
        rates, ratesBase: base, ratesTimestamp: now,
      };
      saveCurrency(persisted);
      set({ rates, ratesBase: base, ratesTimestamp: now, loading: false });
    } catch {
      set({ loading: false, fetchError: true });
    }
  },

  loadCurrency: async () => {
    const saved = await getLocal<Partial<CurrencyPersistedData> | null>(STORAGE_KEYS.currency, null);
    const data = { ...DEFAULT_CURRENCY, ...(saved ?? {}) };
    set({ ...data, hydrated: true });
    const s = get();
    const now = Date.now();
    const stale = s.ratesTimestamp === null || now - s.ratesTimestamp >= SIX_HOURS_MS || s.ratesBase !== s.base;
    if (stale) get().fetchRates();
  },
}));

// ─── GRID MATH ────────────────────────────────────────────────────────────────

export const COLS = 18;
export const ROW_H = 52;
export const GAP = 12;

export function unitW(cw: number) {
  return (cw - GAP * (COLS + 1)) / COLS + GAP;
}

export const unitH = ROW_H + GAP;

export function toPixels(l: Pick<WidgetLayout, "x" | "y" | "w" | "h">, cw: number) {
  const uw = unitW(cw);
  return {
    x: GAP + l.x * uw,
    y: GAP + l.y * unitH,
    w: l.w * uw - GAP,
    h: l.h * unitH - GAP,
  };
}

export function snapCol(px: number, cw: number, span: number) {
  const uw = unitW(cw);
  return Math.max(0, Math.min(COLS - span, Math.round((px - GAP) / uw)));
}

export function snapRow(py: number, span: number) {
  return Math.max(0, Math.round((py - GAP) / unitH));
}

// ─── BOOKMARK ITEMS STORE (standalone icons + folders) ────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export interface BookmarkIconData {
  id: string;
  label: string;
  href: string;
  icon: string;
  bgColor: string;
}

export interface BookmarkFolderData {
  id: string;
  label: string;
  icon: string;
  bgColor: string;
  items: BookmarkIconData[];
}

export function makeBmiId() { return `bmi:${uid()}`; }
export function makeBmfId() { return `bmf:${uid()}`; }

interface BookmarkItemsRecord {
  icons: Record<string, BookmarkIconData>;
  folders: Record<string, BookmarkFolderData>;
}

interface BookmarkItemsStore extends BookmarkItemsRecord {
  hydrated: boolean;
  addIcon: (data: Omit<BookmarkIconData, "id">) => string;
  removeIcon: (id: string) => void;
  updateIcon: (id: string, data: Partial<Omit<BookmarkIconData, "id">>) => void;
  addFolder: (data: Omit<BookmarkFolderData, "id" | "items">) => string;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, data: Partial<Omit<BookmarkFolderData, "id" | "items">>) => void;
  addItemToFolder: (folderId: string, item: Omit<BookmarkIconData, "id">) => void;
  removeItemFromFolder: (folderId: string, itemId: string) => void;
  load: () => Promise<void>;
}

const saveBookmarkItems = debounce((items: BookmarkItemsRecord) => {
  setLocal(STORAGE_KEYS.bookmarkItems, items);
}, 300);

const EMPTY_ITEMS: BookmarkItemsRecord = { icons: {}, folders: {} };

export const useBookmarkItemsStore = create<BookmarkItemsStore>()((set, get) => ({
  icons: {},
  folders: {},
  hydrated: false,

  addIcon: (data) => {
    const id = makeBmiId();
    set((s) => {
      const icons = { ...s.icons, [id]: { ...data, id } };
      saveBookmarkItems({ icons, folders: s.folders });
      return { icons };
    });
    return id;
  },

  removeIcon: (id) =>
    set((s) => {
      const icons = { ...s.icons };
      delete icons[id];
      saveBookmarkItems({ icons, folders: s.folders });
      return { icons };
    }),

  updateIcon: (id, data) =>
    set((s) => {
      if (!s.icons[id]) return s;
      const icons = { ...s.icons, [id]: { ...s.icons[id], ...data } };
      saveBookmarkItems({ icons, folders: s.folders });
      return { icons };
    }),

  addFolder: (data) => {
    const id = makeBmfId();
    set((s) => {
      const folders = { ...s.folders, [id]: { ...data, id, items: [] } };
      saveBookmarkItems({ icons: s.icons, folders });
      return { folders };
    });
    return id;
  },

  removeFolder: (id) =>
    set((s) => {
      const folders = { ...s.folders };
      delete folders[id];
      saveBookmarkItems({ icons: s.icons, folders });
      return { folders };
    }),

  updateFolder: (id, data) =>
    set((s) => {
      if (!s.folders[id]) return s;
      const folders = { ...s.folders, [id]: { ...s.folders[id], ...data } };
      saveBookmarkItems({ icons: s.icons, folders });
      return { folders };
    }),

  addItemToFolder: (folderId, itemData) =>
    set((s) => {
      if (!s.folders[folderId]) return s;
      const item: BookmarkIconData = { ...itemData, id: uid() };
      const folders = {
        ...s.folders,
        [folderId]: { ...s.folders[folderId], items: [...s.folders[folderId].items, item] },
      };
      saveBookmarkItems({ icons: s.icons, folders });
      return { folders };
    }),

  removeItemFromFolder: (folderId, itemId) =>
    set((s) => {
      if (!s.folders[folderId]) return s;
      const folders = {
        ...s.folders,
        [folderId]: {
          ...s.folders[folderId],
          items: s.folders[folderId].items.filter((it) => it.id !== itemId),
        },
      };
      saveBookmarkItems({ icons: s.icons, folders });
      return { folders };
    }),

  load: async () => {
    const saved = await getLocal<BookmarkItemsRecord>(STORAGE_KEYS.bookmarkItems, EMPTY_ITEMS);
    set({ icons: saved.icons ?? {}, folders: saved.folders ?? {}, hydrated: true });
  },
}));
