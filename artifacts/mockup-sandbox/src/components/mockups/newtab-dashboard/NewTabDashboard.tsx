import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Sun, Moon, Settings, X, Command,
  Sparkles, PlusCircle, Edit3, Check, RefreshCw, LayoutGrid,
  Grip, Trash2,
} from "lucide-react";
import { GridLayout } from "./_grid";
import { ClockWidget, WeatherWidget, QuickLinksWidget, TodoWidget, BookmarksWidget, StatRow } from "./_widgets";
import { useGridStore } from "./_store";

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
  },
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
  },
};

type C = typeof COLORS.dark;

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  return { theme, c: COLORS[theme], toggle: () => setTheme(t => t === "dark" ? "light" : "dark") };
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

function SearchBar({ c }: { c: C }) {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
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
        backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <motion.div animate={{ color: focused ? c.primary : c.textMuted }} transition={{ duration: 0.18 }}>
        <Search size={16} />
      </motion.div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search the web or type a URL..."
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
      <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: "rgba(77,168,218,0.07)", border: `1px solid ${c.border}` }}>
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
  const items = [
    { label: "Toggle Edit Mode", icon: Edit3, action: () => { onToggleEdit(); onClose(); } },
    { label: "Toggle Theme", icon: Sun, action: () => { onToggleTheme(); onClose(); } },
    { label: "Refresh Widgets", icon: RefreshCw, action: onClose },
    { label: "Customize Layout", icon: LayoutGrid, action: onClose, divider: true },
    { label: "Remove Widget", icon: Trash2, danger: true, action: onClose },
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
            style={{ color: item.danger ? "#ef4444" : "rgba(232,244,251,0.82)", fontSize: "12.5px", fontFamily: "'Sofia Sans', sans-serif", transition: "background 0.1s" }}
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

function FloatingPanel({ c, theme, editMode, onToggleTheme, onToggleEdit }: {
  c: C; theme: string; editMode: boolean; onToggleTheme: () => void; onToggleEdit: () => void;
}) {
  const actions = [
    { icon: editMode ? Check : Edit3, label: editMode ? "Exit Edit Mode" : "Edit Layout", action: onToggleEdit, accent: editMode },
    { icon: theme === "dark" ? Sun : Moon, label: "Toggle Theme", action: onToggleTheme, accent: false },
    { icon: PlusCircle, label: "Add Widget", action: () => {}, accent: false },
    { icon: Settings, label: "Settings", action: () => {}, accent: false },
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
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${c.secondary}45, transparent)` }} />
      {actions.map(({ icon: Icon, label, action, accent }) => (
        <div key={label} className="relative group">
          <motion.button
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
              <motion.div key={label + accent}
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
      <div style={{ width: "1px", height: "22px", background: "rgba(77,168,218,0.14)", margin: "0 2px" }} />
      <motion.button
        whileHover={{ scale: 1.1 }}
        className="w-10 h-10 rounded-[18px] flex items-center justify-center"
        style={{ background: "rgba(77,168,218,0.09)", border: "1px solid rgba(77,168,218,0.14)" }}
      >
        <Sparkles size={13} style={{ color: c.secondary }} />
      </motion.button>
    </motion.div>
  );
}

// ─── EDIT MODE BANNER ─────────────────────────────────────────────────────────

function EditBanner({ c, onDone }: { c: C; onDone: () => void }) {
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
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,124,199,0.25)" }}>
          <Grip size={14} style={{ color: c.secondary }} />
        </div>
        <div>
          <div style={{ color: c.text, fontSize: "13px", fontWeight: 700 }}>Edit Layout Mode</div>
          <div style={{ color: c.textMuted, fontSize: "11px" }}>Drag widget handles to move · Drag corner to resize · Click × to remove</div>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
        onClick={onDone}
        className="flex items-center gap-1.5 rounded-xl px-4 py-2"
        style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "12.5px", fontWeight: 700, boxShadow: `0 4px 16px ${c.primary}40` }}
      >
        <Check size={12} />
        Done
      </motion.button>
    </motion.div>
  );
}

// ─── GREETING ─────────────────────────────────────────────────────────────────

function Greeting({ c }: { c: C }) {
  const hr = new Date().getHours();
  const greeting = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: 800, color: c.text, lineHeight: 1.1, letterSpacing: "-0.7px", fontFamily: "'Sofia Sans', sans-serif" }}>
        {greeting},&nbsp;
        <span style={{ background: `linear-gradient(135deg, ${c.secondary}, ${c.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Alex
        </span>
      </h1>
      <p style={{ color: c.textMuted, fontSize: "13.5px", marginTop: "4px" }}>
        3 tasks remaining · Streak at 14 days · 18°C outside
      </p>
    </motion.div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function NewTabDashboard() {
  const { theme, c, toggle } = useTheme();
  const { editMode, toggleEditMode } = useGridStore();
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback(() => {
    if (ctxMenu) setCtxMenu(null);
  }, [ctxMenu]);

  // Widget content map
  const widgetMap: Record<string, React.ReactNode> = {
    clock: <ClockWidget c={c} />,
    weather: <WeatherWidget c={c} />,
    quicklinks: <QuickLinksWidget c={c} />,
    todo: <TodoWidget c={c} />,
    bookmarks: <BookmarksWidget c={c} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="w-full min-h-screen overflow-auto"
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      style={{
        background: theme === "dark"
          ? `radial-gradient(ellipse 80% 55% at 15% 8%, rgba(0,124,199,0.13) 0%, transparent 52%),
             radial-gradient(ellipse 60% 48% at 85% 88%, rgba(77,168,218,0.09) 0%, transparent 52%),
             radial-gradient(ellipse 38% 38% at 52% 52%, rgba(0,78,140,0.07) 0%, transparent 58%),
             ${c.bg}`
          : `radial-gradient(ellipse 70% 48% at 20% 8%, rgba(0,124,199,0.06) 0%, transparent 52%),
             radial-gradient(ellipse 50% 40% at 80% 92%, rgba(77,168,218,0.04) 0%, transparent 52%),
             ${c.bg}`,
        color: c.text,
        fontFamily: "'Sofia Sans', 'Inter', sans-serif",
        cursor: editMode ? "default" : "default",
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${theme === "dark" ? "rgba(77,168,218,0.022)" : "rgba(0,124,199,0.028)"} 1px, transparent 1px), linear-gradient(90deg, ${theme === "dark" ? "rgba(77,168,218,0.022)" : "rgba(0,124,199,0.028)"} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-[1260px] mx-auto px-7 py-7 pb-24 flex flex-col gap-4">

        {/* Header */}
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
            style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, transition: "box-shadow 0.18s" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ rotate: -30, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 30, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                {theme === "dark" ? <Sun size={15} style={{ color: c.secondary }} /> : <Moon size={15} style={{ color: c.primary }} />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Edit banner */}
        <AnimatePresence>
          {editMode && <EditBanner c={c} onDone={toggleEditMode} />}
        </AnimatePresence>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          <SearchBar c={c} />
        </motion.div>

        {/* Stats */}
        <StatRow c={c} />

        {/* Drag-and-drop grid */}
        <GridLayout c={c} widgetMap={widgetMap} />

      </div>

      {/* Floating panel */}
      <FloatingPanel
        c={c}
        theme={theme}
        editMode={editMode}
        onToggleTheme={toggle}
        onToggleEdit={toggleEditMode}
      />

      {/* Context menu */}
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
    </motion.div>
  );
}
