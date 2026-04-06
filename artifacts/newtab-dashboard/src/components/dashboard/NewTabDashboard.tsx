import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Sun, Moon, Settings, X, Command,
  PlusCircle, Edit3, Check, RefreshCw, LayoutGrid,
  Grip, Trash2, Globe, User, Palette, ChevronDown,
  Download, Upload, HardDrive, Loader2,
} from "lucide-react";
import { exportDashboard, importDashboard, BackupError } from "../../utils/backup";
import { toast } from "../../hooks/use-toast";
import { Toaster } from "../ui/toaster";
import { GridLayout } from "./grid";
import { ClockWidget, WeatherWidget, QuickLinksWidget, TodoWidget, BookmarksWidget, CalendarWidget, NotesWidget, StatRow, BookmarkIconWidget, BookmarkFolderWidget, PomodoroWidget, HabitWidget, CurrencyWidget } from "./widgets";
import type { C } from "./widgets";
import {
  useGridStore, useThemeStore, useTodoStore, useQuickLinksStore,
  useBookmarksStore, useCalendarStore, useNotesStore, useSettingsStore,
  useBookmarkItemsStore, usePomodoroStore, useHabitStore, useCurrencyStore,
  makeBmiId, makeBmfId, INITIAL_LAYOUTS,
} from "./store";
import type { Language, SearchEngine, BackgroundStyle, ThemeMode, ClockFormat, WeatherUnit, WidgetLayout } from "./store";
import { useTranslation } from "../../utils/i18n";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const COLORS = {
  dark: {
    bg: "#080f17",
    card: "rgba(13,27,42,0.72)",
    cardHover: "rgba(16,32,50,0.88)",
    border: "rgba(77,168,218,0.12)",
    borderHover: "rgba(77,168,218,0.32)",
    primary: "#007CC7",
    secondary: "#4DA8DA",
    accent: "#38bdf8",
    text: "#e8f4fb",
    textMuted: "rgba(232,244,251,0.52)",
    textSubtle: "rgba(232,244,251,0.3)",
    glow: "rgba(0,124,199,0.13)",
    glowMid: "rgba(0,124,199,0.2)",
    glowStrong: "rgba(77,168,218,0.36)",
    shimmer: "rgba(255,255,255,0.04)",
  } as C,
  light: {
    bg: "#eef6fb",
    card: "rgba(255,255,255,0.78)",
    cardHover: "rgba(255,255,255,0.95)",
    border: "rgba(0,124,199,0.11)",
    borderHover: "rgba(0,124,199,0.3)",
    primary: "#007CC7",
    secondary: "#4DA8DA",
    accent: "#0ea5e9",
    text: "#132534",
    textMuted: "rgba(19,37,52,0.56)",
    textSubtle: "rgba(19,37,52,0.35)",
    glow: "rgba(0,124,199,0.06)",
    glowMid: "rgba(0,124,199,0.12)",
    glowStrong: "rgba(0,124,199,0.22)",
    shimmer: "rgba(255,255,255,0.6)",
  } as C,
};

// ─── BACKGROUND STYLES ────────────────────────────────────────────────────────

const BACKGROUNDS: Record<BackgroundStyle, (theme: "dark" | "light") => string> = {
  "gradient-blue": (t) => t === "dark"
    ? `radial-gradient(ellipse 80% 55% at 15% 8%, rgba(0,124,199,0.13) 0%, transparent 52%), radial-gradient(ellipse 60% 48% at 85% 88%, rgba(77,168,218,0.09) 0%, transparent 52%), radial-gradient(ellipse 38% 38% at 52% 52%, rgba(0,78,140,0.07) 0%, transparent 58%), #080f17`
    : `radial-gradient(ellipse 70% 48% at 20% 8%, rgba(0,124,199,0.06) 0%, transparent 52%), radial-gradient(ellipse 50% 40% at 80% 92%, rgba(77,168,218,0.04) 0%, transparent 52%), #eef6fb`,
  "gradient-purple": (t) => t === "dark"
    ? `radial-gradient(ellipse 80% 55% at 15% 8%, rgba(139,92,246,0.16) 0%, transparent 52%), radial-gradient(ellipse 60% 48% at 85% 88%, rgba(109,40,217,0.1) 0%, transparent 52%), #0d0817`
    : `radial-gradient(ellipse 70% 48% at 20% 8%, rgba(139,92,246,0.08) 0%, transparent 52%), radial-gradient(ellipse 50% 40% at 80% 92%, rgba(109,40,217,0.05) 0%, transparent 52%), #f5f0fb`,
  "gradient-green": (t) => t === "dark"
    ? `radial-gradient(ellipse 80% 55% at 15% 8%, rgba(34,197,94,0.12) 0%, transparent 52%), radial-gradient(ellipse 60% 48% at 85% 88%, rgba(16,185,129,0.08) 0%, transparent 52%), #060f0b`
    : `radial-gradient(ellipse 70% 48% at 20% 8%, rgba(34,197,94,0.08) 0%, transparent 52%), radial-gradient(ellipse 50% 40% at 80% 92%, rgba(16,185,129,0.05) 0%, transparent 52%), #f0faf5`,
  "solid": (t) => t === "dark" ? "#080f17" : "#eef6fb",
  "mesh": (t) => t === "dark"
    ? `linear-gradient(135deg, #0a0a2e 0%, #030b17 25%, #0d1b0a 50%, #1a0a2e 75%, #030b17 100%)`
    : `linear-gradient(135deg, #e8eeff 0%, #eef6fb 25%, #e8f5ea 50%, #f0e8f8 75%, #eef6fb 100%)`,
};

const SEARCH_URLS: Record<SearchEngine, string> = {
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  ddg: "https://duckduckgo.com/?q=",
  yandex: "https://yandex.com/search/?text=",
};

// ─── CUSTOM DROPDOWN SELECT ───────────────────────────────────────────────────

interface DropdownOption { value: string; label: string; }

function DropdownSelect({ value, options, onChange, c, maxWidth = 180 }: {
  value: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
  c: C;
  maxWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" style={{ maxWidth, minWidth: 100 }}>
      <motion.button
        whileHover={{ borderColor: c.borderHover }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 w-full"
        style={{
          background: "rgba(77,168,218,0.08)", border: `1px solid ${open ? c.borderHover : c.border}`,
          color: c.text, fontSize: "12px", fontFamily: "'Sofia Sans', sans-serif",
          cursor: "pointer", outline: "none",
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selected?.label ?? value}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ flexShrink: 0, color: c.textSubtle, display: "flex" }}>
          <ChevronDown size={11} />
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-50 right-0 mt-1.5 rounded-2xl overflow-hidden"
            style={{
              background: c.card,
              border: `1px solid ${c.border}`,
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              boxShadow: `0 8px 28px rgba(0,0,0,0.22)`,
              minWidth: "100%",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="py-1 max-h-56 overflow-y-auto">
              {options.map(opt => (
                <motion.button
                  key={opt.value}
                  whileHover={{ background: "rgba(77,168,218,0.09)" }}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2"
                  style={{
                    color: opt.value === value ? c.primary : c.text,
                    fontSize: "12px", fontFamily: "'Sofia Sans', sans-serif",
                    fontWeight: opt.value === value ? 700 : 400,
                    background: "none", border: "none", cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.value === value && <Check size={10} strokeWidth={3} style={{ color: c.primary, flexShrink: 0 }} />}
                  {opt.value !== value && <span style={{ width: 10, flexShrink: 0 }} />}
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────

function SearchBar({ c }: { c: C }) {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const searchEngine = useSettingsStore(s => s.searchEngine);
  const t = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      window.open(`${SEARCH_URLS[searchEngine]}${encodeURIComponent(query)}`, "_blank");
    }
  };

  return (
    <motion.div
      animate={{
        boxShadow: focused ? `0 0 0 2px ${c.primary}40, 0 10px 36px ${c.glowMid}` : `0 4px 18px ${c.glow}`,
        scale: focused ? 1.006 : 1,
      }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 rounded-2xl px-5 py-3.5"
      style={{
        background: focused ? c.cardHover : c.card,
        border: `1px solid ${focused ? c.primary + "50" : c.border}`,
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <motion.div animate={{ color: focused ? c.primary : c.textMuted }} transition={{ duration: 0.18 }}>
        <Search size={16} />
      </motion.div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t.search_placeholder}
        className="flex-1 bg-transparent outline-none"
        style={{ color: c.text, fontSize: "14.5px", fontFamily: "'Sofia Sans', sans-serif" }}
      />
      <AnimatePresence>
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
            transition={{ duration: 0.16 }}
            onClick={() => setQuery("")}
            className="p-1 rounded-lg"
            style={{ color: c.textMuted }}
          >
            <X size={13} />
          </motion.button>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-1 rounded-lg px-2 py-1"
        style={{ background: "rgba(77,168,218,0.07)", border: `1px solid ${c.border}` }}>
        <Command size={9} style={{ color: c.textSubtle }} />
        <span style={{ fontSize: "9.5px", fontWeight: 600, color: c.textSubtle }}>K</span>
      </div>
    </motion.div>
  );
}

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────────

function ContextMenu({ x, y, onClose, onToggleEdit, onToggleTheme }: {
  x: number; y: number; onClose: () => void; onToggleEdit: () => void; onToggleTheme: () => void;
}) {
  const t = useTranslation();
  const items = [
    { label: t.ctx_edit_mode,     icon: Edit3,    action: () => { onToggleEdit(); onClose(); } },
    { label: t.ctx_toggle_theme,  icon: Sun,       action: () => { onToggleTheme(); onClose(); } },
    { label: t.ctx_refresh,       icon: RefreshCw, action: onClose },
    { label: t.ctx_layout,        icon: LayoutGrid, action: onClose, divider: true },
    { label: t.ctx_remove_widget, icon: Trash2,    danger: true, action: onClose },
  ];
  const fx = Math.min(x, window.innerWidth - 228);
  const fy = Math.min(y, window.innerHeight - items.length * 42);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.86, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.86, y: -8 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="fixed z-[9999] rounded-2xl overflow-hidden"
      style={{
        left: fx, top: fy, width: 220,
        background: "rgba(8,15,23,0.94)",
        border: "1px solid rgba(77,168,218,0.22)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(77,168,218,0.08)",
        padding: "5px",
      }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item) => (
        <div key={item.label}>
          {item.divider && <div style={{ height: "1px", background: "rgba(77,168,218,0.12)", margin: "3px 0" }} />}
          <motion.button
            whileHover={{ backgroundColor: item.danger ? "rgba(239,68,68,0.12)" : "rgba(77,168,218,0.1)" }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left"
            style={{ color: item.danger ? "#ef4444" : "rgba(232,244,251,0.82)", fontSize: "12.5px", fontFamily: "'Sofia Sans', sans-serif" }}
            onClick={item.action}
          >
            <item.icon size={13} style={{ flexShrink: 0, opacity: 0.75 }} />
            {item.label}
          </motion.button>
        </div>
      ))}
    </motion.div>
  );
}

// ─── FLOATING PANEL ───────────────────────────────────────────────────────────

// ─── BOOKMARK / GALLERY CONSTANTS ─────────────────────────────────────────────

const ADD_BM_COLORS = ["#007CC7","#8b5cf6","#f59e0b","#ec4899","#10b981","#ef4444","#6366f1","#f97316","#14b8a6","#a855f7"];
const CORE_WIDGET_IDS = ["clock", "weather", "quicklinks", "todo", "bookmarks", "calendar", "notes"] as const;
const WIDGET_SPEC_MAP: Record<string, Omit<WidgetLayout, "id" | "x" | "y" | "title">> = Object.fromEntries(
  INITIAL_LAYOUTS.map(({ id, w, h, minW, minH, maxW, maxH }) => [id, { w, h, minW, minH, maxW, maxH }])
);

// ─── WIDGET GALLERY ───────────────────────────────────────────────────────────

interface GalleryWidget {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  spec: Omit<WidgetLayout, "id" | "x" | "y" | "title"> | null;
}

function WidgetGallery({ c, theme, onClose, onAddIcon, onAddFolder }: {
  c: C;
  theme: "dark" | "light";
  onClose: () => void;
  onAddIcon: (label: string, href: string, icon: string, bgColor: string) => void;
  onAddFolder: (label: string, icon: string, bgColor: string) => void;
}) {
  const t = useTranslation();
  const layouts = useGridStore((s) => s.layouts);
  const addWidget = useGridStore((s) => s.addWidget);
  const removeWidget = useGridStore((s) => s.removeWidget);
  const [search, setSearch] = useState("");
  const [subView, setSubView] = useState<"icon" | "folder" | null>(null);
  const [bmLabel, setBmLabel] = useState("");
  const [bmHref, setBmHref] = useState("");
  const [bmIcon, setBmIcon] = useState("🔗");
  const [bmColor, setBmColor] = useState("#007CC7");

  const allWidgets: GalleryWidget[] = [
    { id: "clock",      emoji: "⏰", label: t.w_clock,          desc: t.wm_desc_clock,      spec: WIDGET_SPEC_MAP.clock },
    { id: "weather",    emoji: "🌤️", label: t.w_weather,        desc: t.wm_desc_weather,    spec: WIDGET_SPEC_MAP.weather },
    { id: "quicklinks", emoji: "⚡", label: t.w_quicklinks,     desc: t.wm_desc_quicklinks, spec: WIDGET_SPEC_MAP.quicklinks },
    { id: "todo",       emoji: "✅", label: t.w_tasks,           desc: t.wm_desc_todo,       spec: WIDGET_SPEC_MAP.todo },
    { id: "bookmarks",  emoji: "🔖", label: t.w_bookmarks,      desc: t.wm_desc_bookmarks,  spec: WIDGET_SPEC_MAP.bookmarks },
    { id: "calendar",   emoji: "📅", label: t.w_calendar,       desc: t.wm_desc_calendar,   spec: WIDGET_SPEC_MAP.calendar },
    { id: "notes",      emoji: "📝", label: t.w_notes,          desc: t.wm_desc_notes,      spec: WIDGET_SPEC_MAP.notes },
    { id: "_bmi",       emoji: "🔗", label: t.bmi_widget_title, desc: t.wm_desc_bmi,        spec: null },
    { id: "_bmf",       emoji: "📁", label: t.bmf_widget_title, desc: t.wm_desc_bmf,        spec: null },
    { id: "pomodoro",   emoji: "🍅", label: t.w_pomodoro,       desc: t.wm_desc_pomodoro,   spec: { w: 6, h: 6,  minW: 5, minH: 6,  maxW: 9,  maxH: 10 } },
    { id: "habit",      emoji: "🎯", label: t.w_habit,          desc: t.wm_desc_habit,      spec: { w: 9, h: 9,  minW: 7, minH: 6,  maxW: 15, maxH: 13 } },
    { id: "currency",   emoji: "💱", label: t.w_currency,       desc: t.wm_desc_currency,   spec: { w: 6, h: 6,  minW: 5, minH: 5,  maxW: 9,  maxH: 10 } },
  ];

  const activeIds = new Set(layouts.map((l) => l.id));
  const q = search.toLowerCase();
  const filtered = allWidgets.filter((w) =>
    !q || w.label.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q)
  );

  const handleAdd = (w: GalleryWidget) => {
    if (w.spec === null) {
      setSubView(w.id === "_bmi" ? "icon" : "folder");
      setBmLabel("");
      setBmHref("");
      setBmIcon(w.id === "_bmi" ? "🔗" : "📁");
      setBmColor("#007CC7");
      return;
    }
    const initial = INITIAL_LAYOUTS.find((l) => l.id === w.id);
    const maxY = layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const layout: WidgetLayout = {
      id: w.id,
      title: w.label,
      x: initial?.x ?? 0,
      y: maxY,
      ...w.spec,
    };
    addWidget(layout);
    onClose();
  };

  const handleBmSubmit = () => {
    if (!bmLabel.trim()) return;
    if (subView === "icon") {
      if (!bmHref.trim()) return;
      const href = bmHref.startsWith("http") ? bmHref : `https://${bmHref}`;
      onAddIcon(bmLabel.trim(), href, bmIcon.trim() || "🔗", bmColor);
    } else if (subView === "folder") {
      onAddFolder(bmLabel.trim(), bmIcon.trim() || "📁", bmColor);
    }
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[90]"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      <motion.div
        data-testid="widget-gallery"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-0 left-0 right-0 z-[100] rounded-t-[32px] no-scrollbar"
        style={{
          background: theme === "dark" ? "rgba(8,15,23,0.98)" : "rgba(240,248,255,0.98)",
          border: `1px solid ${c.border}`,
          borderBottom: "none",
          backdropFilter: "blur(48px) saturate(200%)",
          WebkitBackdropFilter: "blur(48px) saturate(200%)",
          boxShadow: "0 -20px 80px rgba(0,0,0,0.55)",
          maxHeight: "82vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1"
          style={{ background: theme === "dark" ? "rgba(8,15,23,0.96)" : "rgba(240,248,255,0.96)" }}>
          <div className="w-10 h-1 rounded-full" style={{ background: c.border }} />
        </div>

        <div className="px-5 pb-10">
          <div className="flex items-start justify-between mb-4 pt-1">
            <div>
              <div style={{ color: c.text, fontSize: "19px", fontWeight: 800, letterSpacing: "-0.3px" }}>
                {subView ? (subView === "icon" ? t.bmi_widget_title : t.bmf_widget_title) : t.wm_title}
              </div>
              {!subView && (
                <div style={{ color: c.textSubtle, fontSize: "11px", marginTop: "2px" }}>
                  {t.wm_subtitle(CORE_WIDGET_IDS.filter((id) => activeIds.has(id)).length)}
                </div>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.textMuted }}
            >
              <X size={14} />
            </motion.button>
          </div>

          {!subView ? (
            <>
              <div className="relative mb-4">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: c.textMuted }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.wm_search_placeholder}
                  className="w-full rounded-2xl pl-9 pr-3 py-2.5 outline-none"
                  style={{
                    background: "rgba(77,168,218,0.06)",
                    border: `1px solid ${c.border}`,
                    color: c.text,
                    fontSize: "13px",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {filtered.map((w) => {
                  const isActive = w.spec !== null && activeIds.has(w.id);
                  return (
                    <div
                      key={w.id}
                      className="rounded-[20px] p-4 flex flex-col"
                      style={{
                        background: isActive ? "rgba(0,124,199,0.09)" : "rgba(77,168,218,0.05)",
                        border: `1px solid ${isActive ? c.secondary + "38" : c.border}`,
                        transition: "background 0.18s, border-color 0.18s",
                      }}
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div
                          className="w-10 h-10 rounded-[14px] flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})` }}
                        >
                          {w.emoji}
                        </div>
                        {isActive && (
                          <span
                            className="text-[9px] font-bold rounded-full px-2 py-0.5 flex-shrink-0"
                            style={{ background: "rgba(0,124,199,0.18)", color: c.secondary }}
                          >
                            {t.wm_active}
                          </span>
                        )}
                      </div>
                      <div style={{ color: c.text, fontSize: "13px", fontWeight: 700, marginBottom: "3px" }}>{w.label}</div>
                      <div style={{ color: c.textSubtle, fontSize: "10.5px", lineHeight: 1.45, flex: 1, marginBottom: "10px" }}>{w.desc}</div>
                      <button
                        type="button"
                        data-testid={`gallery-btn-${w.id}`}
                        aria-label={isActive ? t.wm_remove : t.wm_add}
                        onClick={() => {
                          if (isActive) { removeWidget(w.id); }
                          else { handleAdd(w); }
                        }}
                        className="w-full rounded-xl py-1.5 text-[11px] font-bold"
                        style={{
                          background: isActive
                            ? "rgba(239,68,68,0.1)"
                            : `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
                          border: isActive ? "1px solid rgba(239,68,68,0.28)" : "none",
                          color: isActive ? "#ef4444" : "white",
                          cursor: "pointer",
                          transition: "opacity 0.15s, transform 0.1s",
                        }}
                      >
                        {isActive ? t.wm_remove : t.wm_add}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-3 max-w-sm">
              <div className="flex gap-2">
                <input value={bmIcon} onChange={(e) => setBmIcon(e.target.value)} placeholder="🔗"
                  className="outline-none rounded-xl px-2 py-1.5 text-center flex-shrink-0"
                  style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "18px", width: "44px" }} />
                <input
                  value={bmLabel}
                  onChange={(e) => setBmLabel(e.target.value)}
                  placeholder={subView === "icon" ? t.bm_title_placeholder : t.bmf_name_placeholder}
                  className="flex-1 outline-none rounded-xl px-2.5 py-1.5"
                  style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "12px" }}
                  autoFocus
                />
              </div>
              {subView === "icon" && (
                <input
                  value={bmHref}
                  onChange={(e) => setBmHref(e.target.value)}
                  placeholder={t.bm_url_placeholder}
                  onKeyDown={(e) => { if (e.key === "Enter") handleBmSubmit(); }}
                  className="w-full outline-none rounded-xl px-2.5 py-1.5"
                  style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "12px" }}
                />
              )}
              <div>
                <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
                  {t.bm_color}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {ADD_BM_COLORS.map((col) => (
                    <button
                      key={col}
                      onClick={() => setBmColor(col)}
                      className="w-5 h-5 rounded-full transition-transform"
                      style={{
                        background: col,
                        transform: bmColor === col ? "scale(1.3)" : "scale(1)",
                        outline: bmColor === col ? `2px solid ${col}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                  onClick={() => setSubView(null)}
                  className="flex-1 rounded-xl py-2"
                  style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "12px", fontWeight: 600 }}
                >
                  {t.bm_back}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                  onClick={handleBmSubmit}
                  className="flex-1 rounded-xl py-2"
                  style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "12px", fontWeight: 700 }}
                >
                  {t.bm_save}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function FloatingPanel({ c, theme, editMode, onToggleTheme, onToggleEdit, onOpenSettings, onOpenAddBookmark }: {
  c: C; theme: string; editMode: boolean;
  onToggleTheme: () => void; onToggleEdit: () => void; onOpenSettings: () => void; onOpenAddBookmark: () => void;
}) {
  const t = useTranslation();
  const actions = [
    { icon: editMode ? Check : Edit3, label: editMode ? t.btn_exit_edit : t.btn_edit_layout, action: onToggleEdit, accent: editMode },
    { icon: theme === "dark" ? Sun : Moon, label: t.btn_toggle_theme, action: onToggleTheme, accent: false },
    { icon: PlusCircle, label: t.btn_add_widget, action: onOpenAddBookmark, accent: false },
    { icon: Settings, label: t.btn_settings, action: onOpenSettings, accent: false },
  ];

  return (
    <motion.div
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.9, duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-[24px] p-1.5"
      style={{
        background: "rgba(7,13,22,0.88)",
        border: "1px solid rgba(77,168,218,0.2)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(77,168,218,0.06), 0 0 36px rgba(0,124,199,0.07)",
      }}
    >
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${c.secondary}45, transparent)` }} />

      {actions.map(({ icon: Icon, label, action, accent }) => (
        <div key={label} className="relative group">
          <motion.button
            data-testid={label === t.btn_settings ? "open-settings" : label === t.btn_edit_layout || label === t.btn_exit_edit ? "edit-layout" : label === t.btn_toggle_theme ? "toggle-theme" : "add-widget"}
            whileHover={{ scale: 1.12, y: -3 }}
            whileTap={{ scale: 0.88 }}
            onClick={(e) => { e.stopPropagation(); action(); }}
            className="w-10 h-10 rounded-[18px] flex items-center justify-center"
            style={{
              background: accent ? `linear-gradient(135deg, ${c.primary}, ${c.secondary})` : "rgba(77,168,218,0.09)",
              border: `1px solid ${accent ? c.secondary + "55" : "rgba(77,168,218,0.14)"}`,
              boxShadow: accent ? `0 4px 16px ${c.primary}45` : "none",
              transition: "all 0.18s",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div key={label + String(accent)}
                initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 20, scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Icon size={14} style={{ color: accent ? "white" : c.textMuted }} />
              </motion.div>
            </AnimatePresence>
          </motion.button>
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap"
            style={{
              background: "rgba(7,13,22,0.94)",
              border: "1px solid rgba(77,168,218,0.18)",
              color: "rgba(232,244,251,0.78)",
              fontSize: "10.5px", fontWeight: 600,
              backdropFilter: "blur(20px)",
              transition: "opacity 0.14s",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            {label}
          </div>
        </div>
      ))}

    </motion.div>
  );
}

// ─── EDIT BANNER ──────────────────────────────────────────────────────────────

function EditBanner({ c, onDone }: { c: C; onDone: () => void }) {
  const t = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: -18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between rounded-2xl px-5 py-3"
      style={{
        background: "linear-gradient(135deg, rgba(0,124,199,0.16), rgba(77,168,218,0.09))",
        border: "1px solid rgba(77,168,218,0.26)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,124,199,0.25)" }}>
          <Grip size={14} style={{ color: c.secondary }} />
        </div>
        <div>
          <div style={{ color: c.text, fontSize: "13px", fontWeight: 700 }}>{t.edit_mode_title}</div>
          <div style={{ color: c.textMuted, fontSize: "11px" }}>{t.edit_mode_hint}</div>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
        onClick={onDone}
        className="flex items-center gap-1.5 rounded-xl px-4 py-2"
        style={{
          background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
          color: "white", fontSize: "12.5px", fontWeight: 700,
          boxShadow: `0 4px 16px ${c.primary}40`,
        }}
      >
        <Check size={12} />
        {t.done}
      </motion.button>
    </motion.div>
  );
}

// ─── GREETING ─────────────────────────────────────────────────────────────────

function Greeting({ c }: { c: C }) {
  const todos = useTodoStore(s => s.todos);
  const userName = useSettingsStore(s => s.userName);
  const t = useTranslation();
  const remaining = todos.filter(to => !to.done).length;
  const hr = new Date().getHours();
  const greeting = hr < 12 ? t.greet_morning : hr < 17 ? t.greet_afternoon : t.greet_evening;
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
    >
      <h1 style={{
        fontSize: "32px", fontWeight: 800, color: c.text,
        lineHeight: 1.1, letterSpacing: "-0.7px",
        fontFamily: "'Sofia Sans', sans-serif", margin: 0,
      }}>
        {greeting},&nbsp;
        <span style={{
          background: `linear-gradient(135deg, ${c.secondary}, ${c.accent})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          {userName || "Alex"}
        </span>
      </h1>
      <p style={{ color: c.textMuted, fontSize: "13.5px", marginTop: "4px", marginBottom: 0 }}>
        {t.tasks_remaining(remaining)}
      </p>
    </motion.div>
  );
}

// ─── SETTINGS DRAWER ──────────────────────────────────────────────────────────

function SettingSection({ title, icon: Icon, c, children }: {
  title: string; icon: React.ElementType; c: C; children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={12} style={{ color: c.secondary }} />
        <span style={{ color: c.textSubtle, fontSize: "9.5px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.2px" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, c, children }: { label: string; c: C; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${c.border}` }}>
      <span style={{ color: c.textMuted, fontSize: "12px", fontWeight: 500 }}>{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function PillGroup<T extends string>({ options, value, onChange, c }: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  c: C;
}) {
  return (
    <div className="flex gap-1">
      {options.map(opt => (
        <button key={opt.value}
          onClick={() => onChange(opt.value)}
          className="rounded-lg px-2.5 py-1"
          style={{
            background: value === opt.value ? `rgba(0,124,199,0.22)` : "rgba(77,168,218,0.06)",
            border: `1px solid ${value === opt.value ? "#007CC7" + "50" : c.border}`,
            color: value === opt.value ? c.secondary : c.textMuted,
            fontSize: "10.5px", fontWeight: 700,
            transition: "all 0.14s",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function BgSwatch({ style, active, onClick, label }: {
  style: BackgroundStyle; active: boolean; onClick: () => void; label: string;
}) {
  const gradients: Record<BackgroundStyle, string> = {
    "gradient-blue": "linear-gradient(135deg, #007CC7, #080f17)",
    "gradient-purple": "linear-gradient(135deg, #8b5cf6, #0d0817)",
    "gradient-green": "linear-gradient(135deg, #22c55e, #060f0b)",
    "solid": "linear-gradient(135deg, #0d1b2a, #1a2840)",
    "mesh": "linear-gradient(135deg, #0a0a2e, #0d1b0a, #1a0a2e)",
  };
  return (
    <motion.button
      whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1"
    >
      <div style={{
        width: "44px", height: "32px", borderRadius: "8px",
        background: gradients[style],
        border: active ? "2px solid #4DA8DA" : "2px solid transparent",
        boxShadow: active ? "0 0 10px rgba(77,168,218,0.4)" : "none",
        transition: "all 0.15s",
      }} />
      <span style={{ fontSize: "9px", color: active ? "#4DA8DA" : "rgba(232,244,251,0.4)", fontWeight: 600 }}>
        {label}
      </span>
    </motion.button>
  );
}

function SettingsDrawer({ c, open, onClose, theme }: {
  c: C; open: boolean; onClose: () => void; theme: "dark" | "light";
}) {
  const t = useTranslation();
  const {
    language, searchEngine, backgroundStyle, customBgColor, userName,
    weatherCity, weatherUnit, clockFormat, clockSeconds, clockTimezone,
    setLanguage, setSearchEngine, setBackgroundStyle, setCustomBgColor, setUserName,
    setWeatherCity, setWeatherUnit, setClockFormat, setClockSeconds, setClockTimezone,
    resetToDefaults,
  } = useSettingsStore();
  const { themeMode, setThemeMode } = useThemeStore();
  const { layouts, resetLayouts } = useGridStore();
  const {
    workDuration, breakDuration, longBreakDuration, longBreakInterval,
    setWorkDuration, setBreakDuration, setLongBreakDuration, setLongBreakInterval,
  } = usePomodoroStore();
  const [nameInput, setNameInput] = useState(userName);
  const [weatherCityInput, setWeatherCityInput] = useState(weatherCity);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importing, setImporting] = useState(false);
  const importReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Clean up pending reload timer if the drawer unmounts before it fires
  useEffect(() => {
    return () => {
      if (importReloadTimerRef.current) clearTimeout(importReloadTimerRef.current);
    };
  }, []);
  const nameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNameChange = (v: string) => {
    setNameInput(v);
    if (nameRef.current) clearTimeout(nameRef.current);
    nameRef.current = setTimeout(() => setUserName(v), 400);
  };

  const handleWeatherCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = weatherCityInput.trim();
    if (v) setWeatherCity(v);
  };

  const handleExport = useCallback(async () => {
    try {
      await exportDashboard();
    } catch { /* silent — download already triggered */ }
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importFileRef.current) importFileRef.current.value = "";
    setImporting(true);
    try {
      await importDashboard(file);
      setImporting(false);
      // Show success toast, then reload after 1.5 s so the user sees feedback
      toast({ title: t.settings_import_success });
      if (importReloadTimerRef.current) clearTimeout(importReloadTimerRef.current);
      importReloadTimerRef.current = setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setImporting(false);
      if (err instanceof BackupError && (err.code === "invalid_format" || err.code === "invalid_json" || err.code === "version_mismatch")) {
        toast({ title: t.settings_import_invalid, variant: "destructive" });
      } else {
        toast({ title: t.settings_import_error, variant: "destructive" });
      }
    }
  }, [t]);

  const handleReset = async () => {
    await resetToDefaults();
    resetLayouts();
    setNameInput("Alex");
    setWeatherCityInput("");
    setExpandedWidget(null);
    setShowResetConfirm(false);
    onClose();
  };

  const COMMON_TIMEZONES = [
    { value: "auto",                 label: t.settings_clock_tz_auto },
    { value: "UTC",                  label: "UTC" },
    { value: "America/New_York",     label: "New York (ET)" },
    { value: "America/Chicago",      label: "Chicago (CT)" },
    { value: "America/Denver",       label: "Denver (MT)" },
    { value: "America/Los_Angeles",  label: "Los Angeles (PT)" },
    { value: "America/Sao_Paulo",    label: "São Paulo (BRT)" },
    { value: "Europe/London",        label: "London (GMT/BST)" },
    { value: "Europe/Paris",         label: "Paris (CET)" },
    { value: "Europe/Berlin",        label: "Berlin (CET)" },
    { value: "Europe/Moscow",        label: "Moscow (MSK)" },
    { value: "Asia/Dubai",           label: "Dubai (GST)" },
    { value: "Asia/Kolkata",         label: "Mumbai/Delhi (IST)" },
    { value: "Asia/Singapore",       label: "Singapore (SGT)" },
    { value: "Asia/Tokyo",           label: "Tokyo (JST)" },
    { value: "Asia/Shanghai",        label: "Beijing/Shanghai (CST)" },
    { value: "Australia/Sydney",     label: "Sydney (AEDT)" },
    { value: "Pacific/Auckland",     label: "Auckland (NZDT)" },
  ];

  const WIDGET_TITLE_MAP: Record<string, string> = {
    clock:      t.w_clock,
    weather:    t.w_weather,
    quicklinks: t.w_quicklinks,
    todo:       t.w_tasks,
    bookmarks:  t.w_bookmarks,
    calendar:   t.w_calendar,
    notes:      t.w_notes,
    pomodoro:   t.w_pomodoro,
    habit:      t.w_habit,
    currency:   t.w_currency,
  };

  const bgOptions: Array<{ value: BackgroundStyle; label: string }> = [
    { value: "gradient-blue",   label: t.settings_bg_gradient_blue },
    { value: "gradient-purple", label: t.settings_bg_gradient_purple },
    { value: "gradient-green",  label: t.settings_bg_gradient_green },
    { value: "solid",           label: t.settings_bg_solid },
    { value: "mesh",            label: t.settings_bg_mesh },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            data-testid="settings-drawer"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 bottom-0 z-[110] overflow-y-auto no-scrollbar"
            style={{
              width: "320px",
              background: theme === "dark" ? "rgba(8,15,23,0.97)" : "rgba(240,248,255,0.97)",
              border: `1px solid ${c.border}`,
              borderRight: "none",
              backdropFilter: "blur(48px) saturate(200%)",
              WebkitBackdropFilter: "blur(48px) saturate(200%)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
              padding: "24px 20px",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div style={{ color: c.text, fontSize: "17px", fontWeight: 800, letterSpacing: "-0.3px" }}>
                  {t.settings_title}
                </div>
                <div style={{ color: c.textSubtle, fontSize: "10px", marginTop: "1px" }}>
                  {t.settings_subtitle}
                </div>
              </div>
              <motion.button
                data-testid="close-settings"
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.textMuted }}
              >
                <X size={14} />
              </motion.button>
            </div>

            <div className="absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${c.secondary}40, transparent)` }} />

            {/* ── Profile ────────────────────────────────────────────────── */}
            <SettingSection title={t.settings_profile} icon={User} c={c}>
              <SettingRow label={t.settings_name} c={c}>
                <input
                  value={nameInput}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder={t.settings_name_placeholder}
                  className="rounded-xl px-2.5 py-1.5 outline-none bg-transparent text-right"
                  style={{ color: c.text, fontSize: "12px", border: `1px solid ${c.border}`, background: "rgba(77,168,218,0.06)", width: "130px" }}
                  onClick={e => e.stopPropagation()}
                />
              </SettingRow>
            </SettingSection>

            {/* ── Appearance ─────────────────────────────────────────────── */}
            <SettingSection title={t.settings_appearance} icon={Palette} c={c}>
              <SettingRow label={t.settings_theme} c={c}>
                <PillGroup
                  options={[
                    { value: "dark" as ThemeMode, label: t.settings_theme_dark },
                    { value: "light" as ThemeMode, label: t.settings_theme_light },
                    { value: "system" as ThemeMode, label: t.settings_theme_system },
                  ]}
                  value={themeMode}
                  onChange={setThemeMode}
                  c={c}
                />
              </SettingRow>
              <SettingRow label={t.settings_language} c={c}>
                <PillGroup
                  options={[
                    { value: "en" as Language, label: t.lang_en },
                    { value: "ru" as Language, label: t.lang_ru },
                  ]}
                  value={language}
                  onChange={setLanguage}
                  c={c}
                />
              </SettingRow>
              <div className="py-3" style={{ borderBottom: `1px solid ${c.border}` }}>
                <div style={{ color: c.textMuted, fontSize: "12px", fontWeight: 500, marginBottom: "10px" }}>
                  {t.settings_background}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {bgOptions.map(opt => (
                    <BgSwatch
                      key={opt.value}
                      style={opt.value}
                      active={backgroundStyle === opt.value}
                      onClick={() => setBackgroundStyle(opt.value)}
                      label={opt.label}
                    />
                  ))}
                </div>
                {backgroundStyle === "solid" && (
                  <div className="flex items-center gap-2 mt-3">
                    <label style={{ color: c.textMuted, fontSize: "12px", fontWeight: 500 }}>
                      {t.settings_bg_custom_color}
                    </label>
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={e => setCustomBgColor(e.target.value)}
                      style={{ width: "32px", height: "24px", borderRadius: "6px", border: `1px solid ${c.border}`, cursor: "pointer", padding: "1px" }}
                    />
                  </div>
                )}
              </div>
            </SettingSection>

            {/* ── Search Engine ───────────────────────────────────────────── */}
            <SettingSection title={t.settings_search_section} icon={Globe} c={c}>
              <SettingRow label={t.settings_search_engine} c={c}>
                <DropdownSelect
                  value={searchEngine}
                  onChange={v => setSearchEngine(v as SearchEngine)}
                  options={[
                    { value: "google", label: t.search_google },
                    { value: "bing", label: t.search_bing },
                    { value: "ddg", label: t.search_ddg },
                    { value: "yandex", label: t.search_yandex },
                  ]}
                  c={c}
                  maxWidth={160}
                />
              </SettingRow>
            </SettingSection>

            {/* ── Widget Settings ─────────────────────────────────────────── */}
            <SettingSection title={t.settings_widgets_section} icon={Settings} c={c}>
              {layouts.filter(l => !l.id.startsWith("bmi:") && !l.id.startsWith("bmf:")).map(layout => {
                const wTitle = WIDGET_TITLE_MAP[layout.id] ?? layout.id;
                const isOpen = expandedWidget === layout.id;
                return (
                  <div key={layout.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                    {/* Collapsible header */}
                    <motion.button
                      whileHover={{ background: "rgba(77,168,218,0.04)" }}
                      onClick={() => setExpandedWidget(isOpen ? null : layout.id)}
                      className="w-full flex items-center justify-between py-2.5 px-0"
                      style={{ color: c.text, textAlign: "left" }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>{wTitle}</span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ color: c.textSubtle, display: "flex" }}
                      >
                        <ChevronDown size={13} />
                      </motion.span>
                    </motion.button>
                    {/* Expandable content */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pb-3 space-y-3">
                            {layout.id === "clock" && (
                              <>
                                <SettingRow label={t.settings_clock_format} c={c}>
                                  <PillGroup
                                    options={[
                                      { value: "12h" as ClockFormat, label: t.settings_clock_12h },
                                      { value: "24h" as ClockFormat, label: t.settings_clock_24h },
                                    ]}
                                    value={clockFormat}
                                    onChange={setClockFormat}
                                    c={c}
                                  />
                                </SettingRow>
                                <SettingRow label={t.settings_clock_seconds} c={c}>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => setClockSeconds(!clockSeconds)}
                                    className="w-9 h-5 rounded-full relative flex-shrink-0"
                                    style={{
                                      background: clockSeconds
                                        ? `linear-gradient(135deg, ${c.primary}, ${c.secondary})`
                                        : "rgba(77,168,218,0.1)",
                                      border: `1px solid ${clockSeconds ? c.secondary + "60" : c.border}`,
                                      transition: "all 0.2s",
                                    }}
                                  >
                                    <motion.div
                                      animate={{ x: clockSeconds ? 16 : 2 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                      className="absolute top-0.5 w-3.5 h-3.5 rounded-full"
                                      style={{ background: clockSeconds ? "white" : c.textMuted }}
                                    />
                                  </motion.button>
                                </SettingRow>
                                <SettingRow label={t.settings_clock_timezone} c={c}>
                                  <DropdownSelect
                                    value={clockTimezone}
                                    onChange={setClockTimezone}
                                    options={COMMON_TIMEZONES}
                                    c={c}
                                    maxWidth={160}
                                  />
                                </SettingRow>
                              </>
                            )}
                            {layout.id === "weather" && (
                              <>
                                <div>
                                  <div style={{ color: c.textMuted, fontSize: "11px", fontWeight: 500, marginBottom: "5px" }}>{t.settings_weather_city}</div>
                                  <form onSubmit={handleWeatherCitySubmit} className="flex gap-1.5">
                                    <input
                                      value={weatherCityInput}
                                      onChange={e => setWeatherCityInput(e.target.value)}
                                      placeholder={t.weather_city_placeholder}
                                      className="flex-1 rounded-xl px-2.5 py-1.5 outline-none"
                                      style={{ color: c.text, fontSize: "11px", border: `1px solid ${c.border}`, background: "rgba(77,168,218,0.06)" }}
                                      onClick={e => e.stopPropagation()}
                                    />
                                    <motion.button
                                      type="submit"
                                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      className="rounded-xl px-2.5"
                                      style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "11px", fontWeight: 700, minWidth: "50px" }}
                                    >
                                      {t.weather_save}
                                    </motion.button>
                                  </form>
                                </div>
                                <SettingRow label={t.settings_weather_units} c={c}>
                                  <PillGroup
                                    options={[
                                      { value: "C" as WeatherUnit, label: `°${t.settings_celsius}` },
                                      { value: "F" as WeatherUnit, label: `°${t.settings_fahrenheit}` },
                                    ]}
                                    value={weatherUnit}
                                    onChange={setWeatherUnit}
                                    c={c}
                                  />
                                </SettingRow>
                              </>
                            )}
                            {layout.id === "pomodoro" && (
                              <>
                                {([
                                  { label: t.pomodoro_work_dur, value: workDuration, set: setWorkDuration, min: 1, max: 90 },
                                  { label: t.pomodoro_break_dur, value: breakDuration, set: setBreakDuration, min: 1, max: 30 },
                                  { label: t.pomodoro_long_dur, value: longBreakDuration, set: setLongBreakDuration, min: 5, max: 60 },
                                  { label: t.pomodoro_interval, value: longBreakInterval, set: setLongBreakInterval, min: 1, max: 10, unit: "×" },
                                ] as Array<{ label: string; value: number; set: (v: number) => void; min: number; max: number; unit?: string }>).map((row) => (
                                  <SettingRow key={row.label} label={row.label} c={c}>
                                    <div className="flex items-center gap-1.5">
                                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                        onClick={() => row.set(Math.max(row.min, row.value - 1))}
                                        style={{ width: 22, height: 22, borderRadius: "7px", background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "14px", cursor: "pointer", lineHeight: 1 }}>−</motion.button>
                                      <span style={{ color: c.text, fontSize: "12px", fontWeight: 700, minWidth: 36, textAlign: "center" }}>
                                        {row.value}{row.unit ?? ` ${t.pomodoro_min}`}
                                      </span>
                                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                        onClick={() => row.set(Math.min(row.max, row.value + 1))}
                                        style={{ width: 22, height: 22, borderRadius: "7px", background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "14px", cursor: "pointer", lineHeight: 1 }}>+</motion.button>
                                    </div>
                                  </SettingRow>
                                ))}
                              </>
                            )}
                            {layout.id !== "clock" && layout.id !== "weather" && layout.id !== "pomodoro" && layout.id !== "habit" && layout.id !== "currency" && !layout.id.startsWith("bmi_") && !layout.id.startsWith("bmf_") && (
                              <div style={{ color: c.textSubtle, fontSize: "11px", fontStyle: "italic", paddingLeft: "2px" }}>
                                {t.settings_widgets_no_settings}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </SettingSection>

            {/* ── Data & Sync ─────────────────────────────────────────────── */}
            <SettingSection title={t.settings_data_section} icon={HardDrive} c={c}>
              {/* Hidden file input for import */}
              <input
                ref={importFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />

              {/* Sync note */}
              <div
                className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-3"
                style={{ background: "rgba(77,168,218,0.07)", border: `1px solid rgba(77,168,218,0.14)` }}
              >
                <RefreshCw size={11} style={{ color: c.secondary, flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: c.textMuted, fontSize: "10.5px", lineHeight: 1.5 }}>
                  {t.settings_sync_note}
                </span>
              </div>

              {/* Export */}
              <div className="mb-2 flex flex-col gap-1">
                <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 600, marginBottom: 2 }}>
                  {t.settings_export_desc}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5"
                  style={{
                    background: "rgba(0,124,199,0.1)",
                    border: "1px solid rgba(0,124,199,0.3)",
                    color: c.secondary,
                    fontSize: "12px", fontWeight: 700,
                  }}
                >
                  <Download size={13} />
                  {t.settings_export}
                </motion.button>
              </div>

              {/* Import */}
              <div className="flex flex-col gap-1">
                <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 600, marginBottom: 2 }}>
                  {t.settings_import_desc}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => importFileRef.current?.click()}
                  disabled={importing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5"
                  style={{
                    background: "rgba(77,168,218,0.07)",
                    border: `1px solid ${c.border}`,
                    color: importing ? c.textSubtle : c.textMuted,
                    fontSize: "12px", fontWeight: 700,
                    opacity: importing ? 0.7 : 1,
                    cursor: importing ? "not-allowed" : "pointer",
                  }}
                >
                  {importing
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Upload size={13} />}
                  {t.settings_import}
                </motion.button>

              </div>
            </SettingSection>

            {/* ── Reset ──────────────────────────────────────────────────── */}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${c.border}` }}>
              <AnimatePresence>
                {showResetConfirm ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex flex-col gap-2"
                  >
                    <div style={{ color: c.textMuted, fontSize: "11.5px", textAlign: "center" }}>
                      {t.settings_reset_confirm}
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={handleReset}
                        className="flex-1 rounded-xl py-2"
                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: "12px", fontWeight: 700 }}
                      >
                        {t.settings_reset_yes}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 rounded-xl py-2"
                        style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "12px", fontWeight: 600 }}
                      >
                        {t.settings_reset_no}
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full rounded-xl py-2.5"
                    style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#ef4444", fontSize: "12px", fontWeight: 700 }}
                  >
                    {t.settings_reset}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function NewTabDashboard() {
  const { theme, toggle } = useThemeStore();
  const c = COLORS[theme];
  const { editMode, toggleEditMode, loadLayouts, layouts, addWidget } = useGridStore();
  const loadTheme = useThemeStore(s => s.loadTheme);
  const loadTodos = useTodoStore(s => s.loadTodos);
  const loadLinks = useQuickLinksStore(s => s.loadLinks);
  const loadBookmarks = useBookmarksStore(s => s.loadBookmarks);
  const loadEvents = useCalendarStore(s => s.loadEvents);
  const loadNotes = useNotesStore(s => s.loadNotes);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const backgroundStyle = useSettingsStore(s => s.backgroundStyle);
  const customBgColor = useSettingsStore(s => s.customBgColor);

  const { icons, folders, addIcon, addFolder, load: loadBookmarkItems } = useBookmarkItemsStore();

  const loadPomodoro = usePomodoroStore(s => s.loadPomodoro);
  const loadHabits = useHabitStore(s => s.loadHabits);
  const loadCurrency = useCurrencyStore(s => s.loadCurrency);

  const themeHydrated = useThemeStore(s => s.hydrated);
  const layoutsHydrated = useGridStore(s => s.hydrated);
  const todosHydrated = useTodoStore(s => s.hydrated);
  const linksHydrated = useQuickLinksStore(s => s.hydrated);
  const bookmarksHydrated = useBookmarksStore(s => s.hydrated);
  const calendarHydrated = useCalendarStore(s => s.hydrated);
  const notesHydrated = useNotesStore(s => s.hydrated);
  const settingsHydrated = useSettingsStore(s => s.hydrated);
  const bookmarkItemsHydrated = useBookmarkItemsStore(s => s.hydrated);
  const pomodoroHydrated = usePomodoroStore(s => s.hydrated);
  const habitsHydrated = useHabitStore(s => s.hydrated);
  const currencyHydrated = useCurrencyStore(s => s.hydrated);
  const allHydrated = themeHydrated && layoutsHydrated && todosHydrated && linksHydrated
    && bookmarksHydrated && calendarHydrated && notesHydrated && settingsHydrated
    && bookmarkItemsHydrated && pomodoroHydrated && habitsHydrated && currencyHydrated;

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    loadTheme();
    loadLayouts();
    loadTodos();
    loadLinks();
    loadBookmarks();
    loadEvents();
    loadNotes();
    loadSettings();
    loadBookmarkItems();
    loadPomodoro();
    loadHabits();
    loadCurrency();
  }, [loadTheme, loadLayouts, loadTodos, loadLinks, loadBookmarks, loadEvents, loadNotes, loadSettings, loadBookmarkItems, loadPomodoro, loadHabits, loadCurrency]);

  const handleAddIcon = useCallback((label: string, href: string, icon: string, bgColor: string) => {
    const id = addIcon({ label, href, icon, bgColor });
    const maxY = layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const layout: WidgetLayout = { id, title: label, x: 0, y: maxY, w: 2, h: 2, minW: 1, minH: 1, maxW: 4, maxH: 4 };
    addWidget(layout);
  }, [addIcon, addWidget, layouts]);

  const handleAddFolder = useCallback((label: string, icon: string, bgColor: string) => {
    const id = addFolder({ label, icon, bgColor });
    const maxY = layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const layout: WidgetLayout = { id, title: label, x: 0, y: maxY, w: 3, h: 3, minW: 1, minH: 1, maxW: 6, maxH: 6 };
    addWidget(layout);
  }, [addFolder, addWidget, layouts]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback(() => {
    if (ctxMenu) setCtxMenu(null);
  }, [ctxMenu]);

  if (!allHydrated) {
    return (
      <div style={{
        width: "100vw", height: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: COLORS.dark.bg,
      }}>
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "40px", height: "40px", borderRadius: "14px",
            background: "linear-gradient(135deg, #007CC7, #4DA8DA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px",
          }}
        >
          ⊞
        </motion.div>
      </div>
    );
  }

  const widgetMap: Record<string, React.ReactNode> = {
    clock: <ClockWidget c={c} />,
    weather: <WeatherWidget c={c} />,
    quicklinks: <QuickLinksWidget c={c} />,
    todo: <TodoWidget c={c} />,
    bookmarks: <BookmarksWidget c={c} />,
    calendar: <CalendarWidget c={c} />,
    notes: <NotesWidget c={c} />,
    pomodoro: <PomodoroWidget c={c} />,
    habit: <HabitWidget c={c} />,
    currency: <CurrencyWidget c={c} />,
  };
  Object.keys(icons).forEach(id => {
    widgetMap[id] = <BookmarkIconWidget c={c} widgetId={id} />;
  });
  Object.keys(folders).forEach(id => {
    widgetMap[id] = <BookmarkFolderWidget c={c} widgetId={id} />;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="w-full min-h-screen overflow-auto"
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      style={{
        background: backgroundStyle === "solid" ? customBgColor : BACKGROUNDS[backgroundStyle](theme),
        color: c.text,
        fontFamily: "'Sofia Sans', 'Inter', sans-serif",
      }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${theme === "dark" ? "rgba(77,168,218,0.022)" : "rgba(0,124,199,0.028)"} 1px, transparent 1px), linear-gradient(90deg, ${theme === "dark" ? "rgba(77,168,218,0.022)" : "rgba(0,124,199,0.028)"} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-[1260px] mx-auto px-7 py-7 pb-24 flex flex-col gap-4">

        <div className="flex items-center justify-between gap-4">
          <Greeting c={c} />
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.1, boxShadow: `0 4px 20px ${c.glowMid}` }}
            whileTap={{ scale: 0.9 }}
            onClick={toggle}
            className="w-10 h-10 rounded-[18px] flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(77,168,218,0.08)",
              border: `1px solid ${c.border}`,
              transition: "box-shadow 0.18s",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ rotate: -30, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 30, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                {theme === "dark"
                  ? <Sun size={15} style={{ color: c.secondary }} />
                  : <Moon size={15} style={{ color: c.primary }} />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>

        <AnimatePresence>
          {editMode && <EditBanner c={c} onDone={toggleEditMode} />}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          <SearchBar c={c} />
        </motion.div>

        <StatRow c={c} />

        <GridLayout c={c} widgetMap={widgetMap} />

      </div>

      <AnimatePresence>
        {galleryOpen && (
          <WidgetGallery
            c={c}
            theme={theme}
            onClose={() => setGalleryOpen(false)}
            onAddIcon={handleAddIcon}
            onAddFolder={handleAddFolder}
          />
        )}
      </AnimatePresence>

      <FloatingPanel
        c={c}
        theme={theme}
        editMode={editMode}
        onToggleTheme={toggle}
        onToggleEdit={toggleEditMode}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAddBookmark={() => setGalleryOpen(v => !v)}
      />

      <AnimatePresence>
        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            onClose={() => setCtxMenu(null)}
            onToggleEdit={toggleEditMode}
            onToggleTheme={toggle}
          />
        )}
      </AnimatePresence>

      <SettingsDrawer c={c} open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} />
      <Toaster />
    </motion.div>
  );
}
