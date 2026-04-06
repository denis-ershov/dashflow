import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Wind, Droplets, Eye, Plus, X, Check, Bookmark, ArrowUp, ArrowDown } from "lucide-react";

type C = {
  card: string; cardHover: string; border: string; borderHover: string;
  primary: string; secondary: string; accent: string;
  text: string; textMuted: string; textSubtle: string;
  glow: string; glowMid: string; glowStrong: string; shimmer: string;
};

// ─── CLOCK ────────────────────────────────────────────────────────────────────

function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return t;
}

export function ClockWidget({ c }: { c: C }) {
  const now = useClock();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const progress = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;

  return (
    <div className="flex flex-col items-center justify-center h-full py-4 px-5 select-none relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${c.secondary}30, transparent 70%)` }} />
      </div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
        className="text-center relative z-10"
      >
        <div style={{ fontSize: "68px", fontWeight: 800, lineHeight: 1, letterSpacing: "-2.5px", color: c.text, fontFamily: "'Sofia Sans', sans-serif" }}>
          {h}
          <motion.span
            animate={{ opacity: [1, 0.15, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ color: c.secondary, margin: "0 2px", fontSize: "60px" }}
          >:</motion.span>
          {m}
        </div>
        <div style={{ fontSize: "32px", fontWeight: 300, color: c.textMuted, letterSpacing: "3px", marginTop: "-2px", fontFamily: "'Sofia Sans', sans-serif" }}>
          {s}
        </div>
        <div style={{ color: c.textMuted, fontSize: "12.5px", fontWeight: 500, marginTop: "10px", letterSpacing: "0.3px" }}>
          {days[now.getDay()]}, {months[now.getMonth()]} {now.getDate()}
        </div>
      </motion.div>
      <div className="absolute bottom-4 left-6 right-6">
        <div className="relative h-[3px] rounded-full" style={{ background: `rgba(77,168,218,0.1)` }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${c.primary}, ${c.secondary}, ${c.accent})` }}
          />
          <div
            className="absolute top-1/2 w-2 h-2 rounded-full"
            style={{ left: `${progress * 100}%`, background: c.accent, boxShadow: `0 0 8px ${c.accent}`, transform: "translateX(-50%) translateY(-50%)" }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 600 }}>12:00 AM</span>
          <span style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 600 }}>11:59 PM</span>
        </div>
      </div>
    </div>
  );
}

// ─── WEATHER ──────────────────────────────────────────────────────────────────

export function WeatherWidget({ c }: { c: C }) {
  return (
    <div className="p-5 h-full flex flex-col justify-between relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.secondary}16, transparent 70%)`, filter: "blur(16px)" }} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>Weather</div>
          <div style={{ color: c.textMuted, fontSize: "12px", marginTop: "1px" }}>San Francisco, CA</div>
        </div>
        <motion.div animate={{ y: [0, -4, 0], rotate: [0, 3, -3, 0] }} transition={{ duration: 5, repeat: Infinity }}>
          <Cloud size={32} style={{ color: c.secondary }} />
        </motion.div>
      </div>
      <div className="flex items-end gap-3 my-2 relative z-10">
        <div style={{ fontSize: "56px", fontWeight: 800, lineHeight: 1, color: c.text, letterSpacing: "-2px", fontFamily: "'Sofia Sans', sans-serif" }}>18°</div>
        <div className="pb-1.5">
          <div style={{ color: c.text, fontSize: "14px", fontWeight: 600 }}>Partly Cloudy</div>
          <div style={{ color: c.textMuted, fontSize: "11px" }}>Feels like 16°C</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 relative z-10">
        {[{ icon: Droplets, label: "Humidity", val: "62%" }, { icon: Wind, label: "Wind", val: "14 km/h" }, { icon: Eye, label: "Visibility", val: "10 km" }].map(({ icon: Ic, label, val }) => (
          <motion.div key={label} whileHover={{ scale: 1.05, y: -1 }}
            className="rounded-2xl p-2 flex flex-col items-center gap-1"
            style={{ background: "rgba(77,168,218,0.07)", border: `1px solid ${c.border}` }}>
            <Ic size={12} style={{ color: c.secondary }} />
            <div style={{ color: c.text, fontSize: "12px", fontWeight: 700 }}>{val}</div>
            <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 500 }}>{label}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-2.5 relative z-10">
        <div className="flex justify-between mb-1.5">
          <span style={{ color: c.textSubtle, fontSize: "10px" }}>Today's range</span>
          <span style={{ color: c.textMuted, fontSize: "10px", fontWeight: 600 }}>12° — 22°</span>
        </div>
        <div className="h-1.5 rounded-full relative" style={{ background: "rgba(77,168,218,0.1)" }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: "58%" }}
            transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute h-full rounded-full"
            style={{ left: "20%", background: `linear-gradient(90deg, ${c.primary}, ${c.secondary})`, boxShadow: `0 0 6px ${c.secondary}50` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── QUICK LINKS ──────────────────────────────────────────────────────────────

const LINKS = [
  { label: "GitHub", icon: "🐙", glow: "rgba(139,92,246,0.3)" },
  { label: "Figma", icon: "🎨", glow: "rgba(242,78,30,0.3)" },
  { label: "Notion", icon: "📝", glow: "rgba(200,200,200,0.2)" },
  { label: "Linear", icon: "📋", glow: "rgba(94,106,210,0.3)" },
  { label: "Vercel", icon: "▲", glow: "rgba(200,200,200,0.2)" },
  { label: "Slack", icon: "💬", glow: "rgba(74,21,75,0.3)" },
];

export function QuickLinksWidget({ c }: { c: C }) {
  return (
    <div className="p-5 h-full">
      <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "12px" }}>
        Quick Access
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LINKS.map((link, i) => (
          <motion.div
            key={link.label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12 + i * 0.06, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.08, y: -3, boxShadow: `0 8px 24px ${link.glow}` }}
            whileTap={{ scale: 0.91 }}
            className="flex flex-col items-center gap-2 rounded-2xl p-3 cursor-pointer"
            style={{ background: "rgba(77,168,218,0.05)", border: `1px solid ${c.border}`, transition: "border-color 0.18s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = c.borderHover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = c.border; }}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>{link.icon}</span>
            <span style={{ color: c.textMuted, fontSize: "10px", fontWeight: 600 }}>{link.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── TODO ─────────────────────────────────────────────────────────────────────

const INIT_TODOS = [
  { id: 1, text: "Review pull requests", done: true },
  { id: 2, text: "Update design system docs", done: false },
  { id: 3, text: "Schedule team standup", done: false },
  { id: 4, text: "Deploy v2.4 to staging", done: false },
  { id: 5, text: "Refactor auth module", done: true },
];

export function TodoWidget({ c }: { c: C }) {
  const [todos, setTodos] = useState(INIT_TODOS);
  const [input, setInput] = useState("");
  const done = todos.filter(t => t.done).length;
  const pct = todos.length ? (done / todos.length) * 100 : 0;
  const r = 17;
  const circ = 2 * Math.PI * r;

  return (
    <div className="p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>Tasks</div>
          <div style={{ color: c.textMuted, fontSize: "11.5px", marginTop: "1px" }}>{done} of {todos.length} complete</div>
        </div>
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 40" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="20" cy="20" r={r} fill="none" strokeWidth="2" stroke="rgba(77,168,218,0.12)" />
            <motion.circle
              cx="20" cy="20" r={r} fill="none" strokeWidth="2"
              stroke="url(#pgrad)" strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
            <defs>
              <linearGradient id="pgrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#007CC7" /><stop offset="100%" stopColor="#4DA8DA" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ color: c.secondary, fontSize: "9.5px", fontWeight: 800, position: "relative", zIndex: 1 }}>{Math.round(pct)}%</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5" style={{ maxHeight: "240px", scrollbarWidth: "none" }}>
        <AnimatePresence>
          {todos.map(todo => (
            <motion.div
              key={todo.id}
              layout
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14, height: 0 }}
              transition={{ duration: 0.2 }}
              className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer"
              style={{ border: "1px solid transparent", transition: "background 0.12s, border-color 0.12s" }}
              whileHover={{ backgroundColor: "rgba(77,168,218,0.07)" }}
              onClick={() => setTodos(p => p.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))}
            >
              <motion.div whileTap={{ scale: 0.78 }} className="flex-shrink-0">
                <AnimatePresence mode="wait">
                  {todo.done ? (
                    <motion.div key="y" initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.16 }}
                      className="w-4.5 h-4.5 rounded-[5px] flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, width: "18px", height: "18px", boxShadow: `0 2px 8px ${c.primary}50` }}>
                      <Check size={10} color="white" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div key="n" initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ width: "18px", height: "18px", borderRadius: "5px", border: `1.5px solid ${c.textSubtle}` }} />
                  )}
                </AnimatePresence>
              </motion.div>
              <span className="flex-1 text-sm" style={{ color: todo.done ? c.textSubtle : c.text, fontSize: "12.5px", textDecoration: todo.done ? "line-through" : "none", textDecorationColor: c.textSubtle }}>
                {todo.text}
              </span>
              <motion.button
                className="flex-shrink-0 p-0.5 rounded-lg opacity-0 group-hover:opacity-100"
                whileHover={{ scale: 1.15 }}
                style={{ color: c.textSubtle }}
                onClick={e => { e.stopPropagation(); setTodos(p => p.filter(t => t.id !== todo.id)); }}
              >
                <X size={11} />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div
        className="flex items-center gap-2 mt-2.5 rounded-2xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-400/30"
        style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, transition: "box-shadow 0.18s" }}
      >
        <Plus size={13} style={{ color: c.secondary, flexShrink: 0 }} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && input.trim()) { setTodos(p => [...p, { id: Date.now(), text: input.trim(), done: false }]); setInput(""); } }}
          placeholder="Add a task..."
          className="flex-1 bg-transparent outline-none"
          style={{ color: c.text, fontSize: "12.5px", fontFamily: "'Sofia Sans', sans-serif" }}
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────

const BOOKMARKS = [
  { title: "Framer Motion Docs", url: "framer.com/motion", tag: "Dev", tc: "#007CC7" },
  { title: "Linear Changelog", url: "linear.app/changelog", tag: "Product", tc: "#8b5cf6" },
  { title: "Raycast Extensions", url: "raycast.com/store", tag: "Tools", tc: "#f59e0b" },
  { title: "Tailwind v4 Alpha", url: "tailwindcss.com", tag: "Dev", tc: "#007CC7" },
  { title: "Arc Browser Blog", url: "arc.net/blog", tag: "Design", tc: "#ec4899" },
];

export function BookmarksWidget({ c }: { c: C }) {
  return (
    <div className="p-5">
      <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "10px" }}>
        Recent Bookmarks
      </div>
      <div className="space-y-0.5">
        {BOOKMARKS.map((bm, i) => (
          <motion.div
            key={bm.title}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.07, duration: 0.28 }}
            whileHover={{ x: 4 }}
            className="flex items-center gap-2.5 cursor-pointer rounded-xl px-2.5 py-2"
            style={{ transition: "background 0.12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(77,168,218,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
          >
            <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${bm.tc}18` }}>
              <Bookmark size={10} style={{ color: bm.tc }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ color: c.text, fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bm.title}</div>
              <div style={{ color: c.textSubtle, fontSize: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bm.url}</div>
            </div>
            <span className="rounded-xl px-1.5 py-0.5 flex-shrink-0" style={{ background: `${bm.tc}14`, color: bm.tc, fontSize: "9px", fontWeight: 700 }}>
              {bm.tag}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── STAT BADGE ROW ───────────────────────────────────────────────────────────

export function StatRow({ c }: { c: C }) {
  const stats = [
    { label: "Streak", value: "14 days", trend: "up" as const },
    { label: "Focus Time", value: "4h 20m", trend: "up" as const },
    { label: "Tasks Done", value: "42" },
    { label: "Bookmarks", value: "128" },
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s, i) => {
        const [hov, setHov] = useState(false);
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.08 + i * 0.06, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.03, y: -2 }}
            onHoverStart={() => setHov(true)}
            onHoverEnd={() => setHov(false)}
            className="rounded-[22px] p-4 relative overflow-hidden"
            style={{
              background: hov ? c.cardHover : c.card,
              border: `1px solid ${hov ? c.borderHover : c.border}`,
              backdropFilter: "blur(28px)",
              boxShadow: hov ? `0 8px 28px ${c.glowMid}` : `0 2px 10px ${c.glow}`,
              transition: "all 0.22s",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.shimmer}, transparent)` }} />
            <div style={{ color: c.textSubtle, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: "8px" }}>{s.label}</div>
            <div className="flex items-end justify-between">
              <div style={{ color: c.text, fontSize: "26px", fontWeight: 800, fontFamily: "'Sofia Sans', sans-serif", lineHeight: 1, letterSpacing: "-0.5px" }}>{s.value}</div>
              {s.trend && (
                <div className="flex items-center gap-1 rounded-xl px-1.5 py-1"
                  style={{ background: s.trend === "up" ? "rgba(34,197,94,0.11)" : "rgba(239,68,68,0.11)", color: s.trend === "up" ? "#22c55e" : "#ef4444", fontSize: "10px", fontWeight: 700 }}>
                  {s.trend === "up" ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                  {s.trend === "up" ? "+12%" : "-3%"}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
