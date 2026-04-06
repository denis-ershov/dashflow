import React from "react";
import ReactDOM from "react-dom/client";
import "../../src/index.css";

function useTheme() {
  const [theme, setTheme] = React.useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("newtab_theme") as "dark" | "light") || "dark"; }
    catch { return "dark"; }
  });
  const toggle = () => setTheme(t => {
    const next = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("newtab_theme", next); } catch {}
    return next;
  });
  return { theme, toggle };
}

const T = {
  dark: {
    bg: "#080f17", card: "rgba(13,27,42,0.98)", border: "rgba(77,168,218,0.16)",
    primary: "#007CC7", secondary: "#4DA8DA", text: "#e8f4fb",
    muted: "rgba(232,244,251,0.55)", subtle: "rgba(232,244,251,0.30)",
  },
  light: {
    bg: "#eef6fb", card: "rgba(255,255,255,0.95)", border: "rgba(0,124,199,0.14)",
    primary: "#007CC7", secondary: "#4DA8DA", text: "#132534",
    muted: "rgba(19,37,52,0.58)", subtle: "rgba(19,37,52,0.34)",
  },
};

function Popup() {
  const { theme, toggle } = useTheme();
  const c = T[theme];

  return (
    <div style={{
      width: "220px",
      fontFamily: "'Sofia Sans', 'Inter', sans-serif",
      background: c.bg,
      color: c.text,
      padding: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      boxSizing: "border-box",
    }}>
      {/* Branding */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "10px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "10px",
          background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", flexShrink: 0,
        }}>⊞</div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, lineHeight: 1 }}>DashFlow</div>
          <div style={{ fontSize: "10px", color: c.subtle }}>Chrome Extension v1.0</div>
        </div>
      </div>

      {/* Open Dashboard */}
      <a
        href="newtab.html"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          padding: "9px 12px", borderRadius: "12px",
          background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
          color: "white", fontSize: "12.5px", fontWeight: 700,
          textDecoration: "none", boxSizing: "border-box",
          boxShadow: `0 3px 12px rgba(0,124,199,0.35)`,
          fontFamily: "inherit",
        }}
        onClick={() => window.close()}
      >
        Open Dashboard →
      </a>

      {/* Settings shortcut + Theme toggle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <button
          onClick={() => { window.open("chrome://settings", "_blank"); window.close(); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
            padding: "8px 6px", borderRadius: "11px",
            background: c.card, border: `1px solid ${c.border}`,
            color: c.muted, fontSize: "11px", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: "15px" }}>⚙️</span>
          <span>Settings</span>
        </button>

        <button
          onClick={toggle}
          title="Toggle dark / light mode"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
            padding: "8px 6px", borderRadius: "11px",
            background: c.card, border: `1px solid ${c.border}`,
            color: c.muted, fontSize: "11px", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: "15px" }}>{theme === "dark" ? "☀️" : "🌙"}</span>
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><Popup /></React.StrictMode>
);
