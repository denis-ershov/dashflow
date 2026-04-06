import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wind, Droplets, Eye, Plus, X, Check, Bookmark, ArrowUp, ArrowDown,
  RefreshCw, Search, Key, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  FileText, GripVertical, Flag, Clock, Settings2, FolderOpen, ExternalLink, Link,
} from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTodoStore, useQuickLinksStore, useBookmarksStore, useCalendarStore, useNotesStore, useSettingsStore, useBookmarkItemsStore, usePomodoroStore, useHabitStore, useCurrencyStore } from "./store";
import type { TodoItem, TodoPriority, BookmarkIconData, BookmarkFolderData, Habit } from "./store";
import { useWeather, toDisplay } from "../../hooks/useWeather";
import { WeatherIcon } from "../weather/WeatherIcon";
import { useTranslation } from "../../utils/i18n";
import type { Translations } from "../../utils/locales/en";

export type C = {
  bg: string;
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
  const language = useSettingsStore(s => s.language);
  const clockFormat = useSettingsStore(s => s.clockFormat);
  const clockSeconds = useSettingsStore(s => s.clockSeconds);
  const clockTimezone = useSettingsStore(s => s.clockTimezone);
  const locale = language === "ru" ? "ru-RU" : "en-US";
  const tz = clockTimezone === "auto" ? undefined : clockTimezone;

  // Extract time parts in the selected timezone using Intl
  const tzParts = new Intl.DateTimeFormat(locale, {
    hour: "numeric", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: tz,
  }).formatToParts(now);
  const getPart = (type: string) => parseInt(tzParts.find(p => p.type === type)?.value ?? "0", 10);
  const hours24 = getPart("hour") % 24;
  const minutes = getPart("minute");
  const seconds = getPart("second");

  const hours12 = hours24 % 12 || 12;
  const h = clockFormat === "24h" ? hours24.toString().padStart(2, "0") : hours12.toString().padStart(2, "0");
  const m = minutes.toString().padStart(2, "0");
  const s = seconds.toString().padStart(2, "0");
  const ampm = clockFormat === "12h"
    ? new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true, timeZone: tz })
        .formatToParts(now)
        .find(p => p.type === "dayPeriod")?.value ?? null
    : null;
  const dateStr = now.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric", timeZone: tz });
  const progress = (hours24 * 3600 + minutes * 60 + seconds) / 86400;
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: clockFormat === "12h", timeZone: tz });
  const dayStart = timeFmt.format(new Date(2000, 0, 1, 0, 0));
  const dayEnd = timeFmt.format(new Date(2000, 0, 1, 23, 59));

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
          {ampm && (
            <span style={{ fontSize: "22px", fontWeight: 600, color: c.textMuted, marginLeft: "6px", letterSpacing: "0.5px" }}>{ampm}</span>
          )}
        </div>
        {clockSeconds && (
          <div style={{ fontSize: "32px", fontWeight: 300, color: c.textMuted, letterSpacing: "3px", marginTop: "-2px", fontFamily: "'Sofia Sans', sans-serif" }}>
            {s}
          </div>
        )}
        <div style={{ color: c.textMuted, fontSize: "12.5px", fontWeight: 500, marginTop: "10px", letterSpacing: "0.3px" }}>
          {dateStr}
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
          <span style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 600 }}>{dayStart}</span>
          <span style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 600 }}>{dayEnd}</span>
        </div>
      </div>
    </div>
  );
}

// ─── WEATHER ──────────────────────────────────────────────────────────────────

function localizeWeatherError(error: string | null, t: Translations): string | null {
  if (!error) return null;
  if (error.includes("Invalid API key") || error.includes("401")) return t.weather_err_invalid_key;
  if (error.includes("City not found") || error.includes("404")) return t.weather_err_city_not_found;
  if (error.includes("Too many") || error.includes("429")) return t.weather_err_too_many;
  if (error.includes("service") || error.includes("500")) return t.weather_err_server;
  return t.weather_err_generic;
}

export function WeatherWidget({ c }: { c: C }) {
  const t = useTranslation();
  const {
    weather, forecast, loading, error,
    unit, toggleUnit,
    city, setCity, searchCity,
    hasApiKey, apiKey, setApiKey, saveApiKey,
    geoPermission, refetch,
  } = useWeather();

  const settingsWeatherCity = useSettingsStore(s => s.weatherCity);
  const settingsWeatherUnit = useSettingsStore(s => s.weatherUnit);
  const setWeatherCity = useSettingsStore(s => s.setWeatherCity);
  const setWeatherUnit = useSettingsStore(s => s.setWeatherUnit);
  const language = useSettingsStore(s => s.language);
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [showApiInput, setShowApiInput] = useState(false);
  const [apiInput, setApiInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [showCitySearch, setShowCitySearch] = useState(false);

  // When the settings panel changes weatherCity, trigger a search in this widget
  const prevSettingsCityRef = useRef(settingsWeatherCity);
  useEffect(() => {
    if (settingsWeatherCity && settingsWeatherCity !== city && settingsWeatherCity !== prevSettingsCityRef.current) {
      prevSettingsCityRef.current = settingsWeatherCity;
      searchCity(settingsWeatherCity);
    }
  }, [settingsWeatherCity, city, searchCity]);

  // When the settings panel changes weatherUnit, sync the hook's unit
  useEffect(() => {
    if (settingsWeatherUnit !== unit) {
      toggleUnit();
    }
  }, [settingsWeatherUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-show city search if geo was denied and we have no data
  useEffect(() => {
    if (geoPermission === "denied" && !weather && !loading) {
      setShowCitySearch(true);
    }
  }, [geoPermission, weather, loading]);

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    const trimmed = cityInput.trim();
    setCity(trimmed);
    await searchCity(trimmed);
    setWeatherCity(trimmed);
    setShowCitySearch(false);
    setCityInput("");
  };

  const handleToggleUnit = () => {
    const next = unit === "C" ? "F" : "C";
    toggleUnit();
    setWeatherUnit(next);
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiInput.trim()) return;
    await saveApiKey(apiInput.trim());
    setShowApiInput(false);
    setApiInput("");
  };

  // ── No API key state ───────────────────────────────────────────────────────
  if (!hasApiKey && !showApiInput) {
    return (
      <div className="p-5 h-full flex flex-col items-center justify-center gap-3 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${c.secondary}16, transparent 70%)`, filter: "blur(16px)" }} />
        <div style={{ fontSize: "32px" }}>🌤️</div>
        <div style={{ color: c.textMuted, fontSize: "12px", fontWeight: 600, textAlign: "center", lineHeight: 1.4 }}>
          {t.weather_api_prompt}
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShowApiInput(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2"
          style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "12px", fontWeight: 700, boxShadow: `0 4px 14px ${c.primary}40` }}
        >
          <Key size={12} />
          {t.weather_set_key}
        </motion.button>
        <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer"
          style={{ color: c.textSubtle, fontSize: "10px", textDecoration: "none", textDecorationLine: "underline" }}>
          {t.weather_get_key}
        </a>
      </div>
    );
  }

  // ── API key entry form ─────────────────────────────────────────────────────
  if (showApiInput) {
    return (
      <div className="p-5 h-full flex flex-col justify-center gap-3 relative overflow-hidden">
        <div style={{ color: c.text, fontSize: "13px", fontWeight: 700 }}>{t.weather_key_label}</div>
        <div style={{ color: c.textMuted, fontSize: "11px" }}>{t.weather_key_stored}</div>
        <form onSubmit={handleSaveApiKey} className="flex flex-col gap-2">
          <input
            value={apiInput}
            onChange={e => setApiInput(e.target.value)}
            placeholder={t.weather_key_placeholder}
            className="rounded-xl px-3 py-2 outline-none bg-transparent"
            style={{ color: c.text, fontSize: "12px", border: `1px solid ${c.border}`, background: "rgba(77,168,218,0.07)", fontFamily: "monospace" }}
            autoFocus
          />
          <div className="flex gap-2">
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              className="flex-1 rounded-xl py-2"
              style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "12px", fontWeight: 700 }}>
              {t.weather_save}
            </motion.button>
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowApiInput(false); setApiInput(""); }}
              className="rounded-xl px-3"
              style={{ background: "rgba(77,168,218,0.07)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "12px" }}>
              {t.weather_cancel}
            </motion.button>
          </div>
        </form>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && !weather) {
    return (
      <div className="p-5 h-full flex flex-col items-center justify-center gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <RefreshCw size={24} style={{ color: c.secondary }} />
        </motion.div>
        <div style={{ color: c.textMuted, fontSize: "12px" }}>{t.weather_loading}</div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !weather) {
    const localizedError = localizeWeatherError(error, t);
    return (
      <div className="p-5 h-full flex flex-col items-center justify-center gap-3">
        <div style={{ fontSize: "28px" }}>⚠️</div>
        <div style={{ color: c.textMuted, fontSize: "12px", textAlign: "center" }}>{localizedError}</div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            onClick={refetch}
            className="rounded-xl px-3 py-1.5"
            style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "11px", fontWeight: 700 }}>
            {t.weather_retry}
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowApiInput(true)}
            className="rounded-xl px-3 py-1.5"
            style={{ background: "rgba(77,168,218,0.07)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "11px" }}>
            {t.weather_change_key_btn}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── City search overlay ────────────────────────────────────────────────────
  if (showCitySearch && !weather) {
    return (
      <div className="p-5 h-full flex flex-col justify-center gap-3">
        <div style={{ color: c.text, fontSize: "13px", fontWeight: 700 }}>{t.weather_search_city}</div>
        <div style={{ color: c.textMuted, fontSize: "11px" }}>{t.weather_geo_denied}</div>
        <form onSubmit={handleCitySearch} className="flex gap-2">
          <input
            value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            placeholder={t.weather_city_placeholder}
            className="flex-1 rounded-xl px-3 py-2 outline-none bg-transparent"
            style={{ color: c.text, fontSize: "12px", border: `1px solid ${c.border}`, background: "rgba(77,168,218,0.07)" }}
            autoFocus
          />
          <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="rounded-xl px-3"
            style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white" }}>
            <Search size={14} />
          </motion.button>
        </form>
      </div>
    );
  }

  // ── Main weather display ───────────────────────────────────────────────────
  if (!weather) return null;

  const temp = toDisplay(weather.temp, unit);
  const feels = toDisplay(weather.feelsLike, unit);
  const tMin = toDisplay(weather.tempMin, unit);
  const tMax = toDisplay(weather.tempMax, unit);
  const windKmh = Math.round(weather.windSpeed * 3.6);
  const visMkm = weather.visibility >= 1000
    ? `${(weather.visibility / 1000).toFixed(0)} km`
    : `${weather.visibility} m`;

  const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="p-5 h-full flex flex-col relative overflow-hidden" style={{ gap: "6px" }}>
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.secondary}16, transparent 70%)`, filter: "blur(16px)" }} />

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0">
          <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>{t.w_weather}</div>
          <div style={{ color: c.textMuted, fontSize: "12px", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {weather.city}{weather.country ? `, ${weather.country}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* °C/°F toggle */}
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            onClick={handleToggleUnit}
            className="rounded-lg px-2 py-0.5"
            style={{ background: "rgba(77,168,218,0.1)", border: `1px solid ${c.border}`, color: c.secondary, fontSize: "11px", fontWeight: 700 }}>
            °{unit === "C" ? "F" : "C"}
          </motion.button>
          {/* Refresh */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
            onClick={refetch}
            style={{ color: c.textSubtle }}
            disabled={loading}
          >
            <motion.div animate={loading ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <RefreshCw size={13} />
            </motion.div>
          </motion.button>
          {/* City search */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
            onClick={() => setShowCitySearch(v => !v)}
            style={{ color: c.textSubtle }}
          >
            <Search size={13} />
          </motion.button>
        </div>
      </div>

      {/* Inline city search (when weather is loaded) */}
      <AnimatePresence>
        {showCitySearch && weather && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!cityInput.trim()) return;
              await searchCity(cityInput.trim());
              setShowCitySearch(false);
              setCityInput("");
            }}
            className="flex gap-2 overflow-hidden relative z-10"
          >
            <input
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              placeholder={t.weather_search_placeholder}
              className="flex-1 rounded-xl px-3 py-1.5 outline-none bg-transparent"
              style={{ color: c.text, fontSize: "12px", border: `1px solid ${c.border}`, background: "rgba(77,168,218,0.07)" }}
              autoFocus
            />
            <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="rounded-xl px-2.5"
              style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white" }}>
              <Search size={13} />
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Temperature + icon */}
      <div className="flex items-center gap-3 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div key={weather.conditionCode}
            initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.3 }}>
            <WeatherIcon code={weather.conditionCode} isNight={weather.isNight} size={46} />
          </motion.div>
        </AnimatePresence>
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={`${temp}${unit}`}
              initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ fontSize: "48px", fontWeight: 800, lineHeight: 1, color: c.text, letterSpacing: "-2px", fontFamily: "'Sofia Sans', sans-serif" }}>
              {temp}°
            </motion.div>
          </AnimatePresence>
          <div style={{ color: c.text, fontSize: "13px", fontWeight: 600 }}>{capitalizeFirst(weather.description)}</div>
          <div style={{ color: c.textMuted, fontSize: "10.5px" }}>
            {t.weather_feels_like} {feels}° · {tMin}° — {tMax}°
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 relative z-10">
        {[
          { icon: Droplets, label: t.weather_humidity, val: `${weather.humidity}%` },
          { icon: Wind,     label: t.weather_wind,    val: `${windKmh} km/h` },
          { icon: Eye,      label: t.weather_visibility, val: visMkm },
        ].map(({ icon: Ic, label, val }) => (
          <motion.div key={label} whileHover={{ scale: 1.05, y: -1 }}
            className="rounded-xl p-1.5 flex flex-col items-center gap-0.5"
            style={{ background: "rgba(77,168,218,0.07)", border: `1px solid ${c.border}` }}>
            <Ic size={11} style={{ color: c.secondary }} />
            <div style={{ color: c.text, fontSize: "11px", fontWeight: 700 }}>{val}</div>
            <div style={{ color: c.textSubtle, fontSize: "8.5px", fontWeight: 500 }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* 5-day forecast */}
      {forecast.length > 0 && (
        <div className="relative z-10">
          <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
            {t.weather_forecast}
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${forecast.length}, 1fr)` }}>
            {forecast.map((day, i) => {
              const dayLabel = new Date(2025, 0, 5 + day.dayOfWeek).toLocaleString(locale, { weekday: "short" });
              return (
              <motion.div
                key={day.dayOfWeek + "-" + i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.3 }}
                className="flex flex-col items-center gap-0.5 rounded-xl py-1.5"
                style={{ background: "rgba(77,168,218,0.05)", border: `1px solid ${c.border}` }}>
                <div style={{ color: c.textMuted, fontSize: "9px", fontWeight: 700 }}>{dayLabel}</div>
                <WeatherIcon code={day.conditionCode} size={20} />
                <div style={{ color: c.text, fontSize: "9px", fontWeight: 700 }}>{toDisplay(day.tempMax, unit)}°</div>
                <div style={{ color: c.textSubtle, fontSize: "8.5px" }}>{toDisplay(day.tempMin, unit)}°</div>
              </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-auto relative z-10">
        <motion.button
          whileHover={{ scale: 1.04 }}
          onClick={() => setShowApiInput(true)}
          style={{ color: c.textSubtle, fontSize: "9px" }}
          className="flex items-center gap-1"
        >
          <Key size={9} />
          {t.weather_change_key}
        </motion.button>
      </div>
    </div>
  );
}

// ─── QUICK LINKS ──────────────────────────────────────────────────────────────

export function QuickLinksWidget({ c }: { c: C }) {
  const t = useTranslation();
  const { links, add, remove } = useQuickLinksStore();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("🔗");
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  const handleAdd = () => {
    if (!label.trim() || !url.trim()) return;
    const href = url.startsWith("http") ? url.trim() : `https://${url.trim()}`;
    add({ label: label.trim(), icon: icon.trim() || "🔗", glow: "rgba(77,168,218,0.3)", href });
    setLabel(""); setUrl(""); setIcon("🔗"); setShowForm(false);
  };

  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>
          {t.w_quicklinks}
        </div>
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
          onClick={() => setShowForm(v => !v)}
          style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, cursor: "pointer", background: "none", border: "none", padding: "0 2px" }}
        >
          {showForm ? t.ql_cancel : t.ql_add}
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden mb-3"
          >
            <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(77,168,218,0.05)", border: `1px solid ${c.border}` }}>
              <div className="flex gap-2">
                <input
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  placeholder={t.ql_icon_placeholder}
                  className="outline-none rounded-xl px-2 py-1.5 text-center"
                  style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "16px", width: "44px" }}
                />
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={t.ql_label_placeholder}
                  className="flex-1 outline-none rounded-xl px-2.5 py-1.5"
                  style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }}
                />
              </div>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={t.ql_url_placeholder}
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                className="w-full outline-none rounded-xl px-2.5 py-1.5"
                style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }}
              />
              <div className="flex gap-2 justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(false)}
                  className="rounded-xl px-3 py-1"
                  style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "11px", fontWeight: 600 }}
                >
                  {t.ql_cancel}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleAdd}
                  className="rounded-xl px-3 py-1"
                  style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "11px", fontWeight: 700 }}
                >
                  {t.ql_save}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-2">
        {links.map((link, i) => (
          <div
            key={link.href}
            className="relative"
            onMouseEnter={() => setHoveredHref(link.href)}
            onMouseLeave={() => setHoveredHref(null)}
          >
            <motion.a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.08, y: -3, boxShadow: `0 8px 24px ${link.glow}` }}
              whileTap={{ scale: 0.91 }}
              className="flex flex-col items-center gap-2 rounded-2xl p-3 cursor-pointer w-full"
              style={{
                background: "rgba(77,168,218,0.05)", border: `1px solid ${c.border}`,
                transition: "border-color 0.18s", textDecoration: "none",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = c.borderHover; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = c.border; }}
            >
              <span style={{ fontSize: "20px", lineHeight: 1 }}>{link.icon}</span>
              <span style={{ color: c.textMuted, fontSize: "10px", fontWeight: 600 }}>{link.label}</span>
            </motion.a>
            <AnimatePresence>
              {hoveredHref === link.href && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.15 }}
                  onClick={e => { e.preventDefault(); remove(link.href); }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.85)", color: "white", zIndex: 10 }}
                  title={t.ql_delete}
                >
                  <X size={8} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TODO (ENHANCED) ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TodoPriority, { color: string }> = {
  low:    { color: "#22c55e" },
  medium: { color: "#f59e0b" },
  high:   { color: "#ef4444" },
};

function SortableTodoRow({
  todo, c, dragEnabled,
  onToggle, onRemove, onSetPriority, onSetDeadline,
}: {
  todo: TodoItem; c: C; dragEnabled: boolean;
  onToggle: () => void; onRemove: () => void;
  onSetPriority: (p: TodoPriority | undefined) => void;
  onSetDeadline: (d: string | undefined) => void;
}) {
  const t = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id, disabled: !dragEnabled });
  const [expanded, setExpanded] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const PRIORITY_LABEL: Record<TodoPriority, string> = {
    low: t.priority_low, medium: t.priority_medium, high: t.priority_high,
  };

  const deadlineLabel = todo.deadline
    ? new Date(todo.deadline + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  const isOverdue = todo.deadline && !todo.done && new Date(todo.deadline + "T00:00:00") < new Date();

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 50 : undefined,
        position: "relative",
      }}
    >
      <div
        className="group flex items-center gap-2 rounded-xl px-2 py-1.5 relative"
        style={{ background: expanded ? "rgba(77,168,218,0.07)" : undefined, transition: "background 0.12s" }}
        onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = "rgba(77,168,218,0.05)"; }}
        onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = ""; }}
      >
        {/* Drag handle — only visible in All tab */}
        {dragEnabled ? (
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
            style={{ color: c.textSubtle, touchAction: "none", transition: "opacity 0.12s" }}
            onClick={e => e.stopPropagation()}
          >
            <GripVertical size={12} />
          </div>
        ) : (
          <div style={{ width: "12px", flexShrink: 0 }} />
        )}

        {/* Checkbox */}
        <motion.div whileTap={{ scale: 0.78 }} className="flex-shrink-0 cursor-pointer" onClick={onToggle}>
          <AnimatePresence mode="wait">
            {todo.done ? (
              <motion.div key="y" initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }} transition={{ duration: 0.16 }}
                className="flex items-center justify-center"
                style={{ width: "17px", height: "17px", borderRadius: "5px", background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})` }}>
                <Check size={9} color="white" strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.div key="n" initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{ width: "17px", height: "17px", borderRadius: "5px", border: `1.5px solid ${c.textSubtle}` }} />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Priority dot */}
        {todo.priority && (
          <div className="relative flex-shrink-0">
            <div
              style={{ width: "7px", height: "7px", borderRadius: "50%", background: PRIORITY_CONFIG[todo.priority].color, cursor: "pointer", flexShrink: 0, boxShadow: `0 0 6px ${PRIORITY_CONFIG[todo.priority].color}60` }}
              onClick={e => { e.stopPropagation(); setShowPriorityMenu(v => !v); }}
            />
            <AnimatePresence>
              {showPriorityMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.14 }}
                  className="absolute left-0 top-5 z-50 rounded-xl overflow-hidden"
                  style={{ background: "rgba(8,15,23,0.96)", border: "1px solid rgba(77,168,218,0.2)", width: "100px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                  onClick={e => e.stopPropagation()}
                >
                  {(["low", "medium", "high"] as TodoPriority[]).map(p => (
                    <button key={p}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/5"
                      style={{ color: PRIORITY_CONFIG[p].color, fontSize: "11px", fontWeight: 600 }}
                      onClick={() => { onSetPriority(p === todo.priority ? undefined : p); setShowPriorityMenu(false); }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: PRIORITY_CONFIG[p].color }} />
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Text */}
        <span
          className="flex-1 cursor-pointer"
          style={{ color: todo.done ? c.textSubtle : c.text, fontSize: "12px", fontWeight: 500, textDecoration: todo.done ? "line-through" : "none", textDecorationColor: c.textSubtle, lineHeight: 1.3 }}
          onClick={() => setExpanded(v => !v)}
        >
          {todo.text}
        </span>

        {/* Deadline badge */}
        {deadlineLabel && (
          <div style={{ color: isOverdue ? "#ef4444" : c.textSubtle, fontSize: "9px", fontWeight: 600, flexShrink: 0 }}>
            {deadlineLabel}
          </div>
        )}

        {/* Actions (hover) */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!todo.priority && (
            <button
              onClick={e => { e.stopPropagation(); onSetPriority("medium"); }}
              style={{ color: c.textSubtle }} title={t.todo_tooltip_priority}
            >
              <Flag size={10} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); setExpanded(v => !v); }} style={{ color: c.textSubtle }} title={t.todo_tooltip_expand}>
            <Clock size={10} />
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ color: c.textSubtle }} title={t.todo_tooltip_remove}>
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Expanded: deadline field */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-8 pb-1.5">
              <Clock size={10} style={{ color: c.textSubtle }} />
              <span style={{ color: c.textSubtle, fontSize: "10px" }}>{t.deadline_label}</span>
              <input
                type="date"
                value={todo.deadline ?? ""}
                onChange={e => onSetDeadline(e.target.value || undefined)}
                className="bg-transparent outline-none"
                style={{ color: c.textMuted, fontSize: "10px", border: "none", cursor: "pointer" }}
                onClick={e => e.stopPropagation()}
              />
              {todo.deadline && (
                <button onClick={() => onSetDeadline(undefined)} style={{ color: c.textSubtle }}>
                  <X size={9} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TodoWidget({ c }: { c: C }) {
  const t = useTranslation();
  const { todos, toggle, add, remove, setPriority, setDeadline, reorder } = useTodoStore();
  const [input, setInput] = useState("");
  const [newPriority, setNewPriority] = useState<TodoPriority | undefined>(undefined);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const sorted = [...todos].sort((a, b) => a.order - b.order);
  const filtered = sorted.filter(td =>
    filter === "all" ? true : filter === "active" ? !td.done : td.done
  );
  const done = todos.filter(td => td.done).length;
  const pct = todos.length ? (done / todos.length) * 100 : 0;
  const r = 17;
  const circ = 2 * Math.PI * r;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorder(Number(active.id), Number(over.id));
  }, [reorder]);

  const filters: Array<{ key: "all" | "active" | "done"; label: string }> = [
    { key: "all",    label: t.todo_filter_all },
    { key: "active", label: t.todo_filter_active },
    { key: "done",   label: t.todo_filter_done },
  ];

  return (
    <div className="p-4 flex flex-col h-full" style={{ gap: "6px" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>{t.w_tasks}</div>
          <div style={{ color: c.textMuted, fontSize: "11px", marginTop: "1px" }}>{t.todo_complete(done, todos.length)}</div>
        </div>
        <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 40" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="20" cy="20" r={r} fill="none" strokeWidth="2" stroke="rgba(77,168,218,0.12)" />
            <motion.circle
              cx="20" cy="20" r={r} fill="none" strokeWidth="2"
              stroke="url(#pgrad2)" strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
            <defs>
              <linearGradient id="pgrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#007CC7" /><stop offset="100%" stopColor="#4DA8DA" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ color: c.secondary, fontSize: "9px", fontWeight: 800, position: "relative", zIndex: 1 }}>{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-shrink-0">
        {filters.map(f => (
          <button key={f.key}
            onClick={() => setFilter(f.key)}
            className="rounded-lg px-2.5 py-1"
            style={{
              background: filter === f.key ? `rgba(0,124,199,0.18)` : "transparent",
              border: `1px solid ${filter === f.key ? c.primary + "40" : "transparent"}`,
              color: filter === f.key ? c.secondary : c.textSubtle,
              fontSize: "10px", fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sortable list — drag only enabled in "All" tab to avoid confusing cross-filter reordering */}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ minHeight: 0 }}>
        <DndContext sensors={filter === "all" ? sensors : []} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {filtered.map(todo => (
                <SortableTodoRow
                  key={todo.id}
                  todo={todo}
                  c={c}
                  dragEnabled={filter === "all"}
                  onToggle={() => toggle(todo.id)}
                  onRemove={() => remove(todo.id)}
                  onSetPriority={p => setPriority(todo.id, p)}
                  onSetDeadline={d => setDeadline(todo.id, d)}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Check size={20} style={{ color: c.textSubtle, opacity: 0.4 }} />
            <div style={{ color: c.textSubtle, fontSize: "11px" }}>
              {filter === "done" ? t.todo_empty_done : t.todo_empty_all}
            </div>
          </div>
        )}
      </div>

      {/* Add task input */}
      <div className="flex items-center gap-2 rounded-2xl px-3 py-2 flex-shrink-0"
        style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}` }}>
        {/* Priority selector for new task */}
        <div className="relative">
          <div
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: newPriority ? PRIORITY_CONFIG[newPriority].color : c.textSubtle, cursor: "pointer", flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); }}
            title={t.todo_new_priority}
          />
        </div>
        <Plus size={12} style={{ color: c.secondary, flexShrink: 0 }} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && input.trim()) {
              add(input.trim(), newPriority);
              setInput("");
              setNewPriority(undefined);
            }
          }}
          placeholder={t.todo_placeholder}
          className="flex-1 bg-transparent outline-none"
          style={{ color: c.text, fontSize: "12px", fontFamily: "'Sofia Sans', sans-serif" }}
          onClick={e => e.stopPropagation()}
        />
        {/* Priority cycle button */}
        <div className="flex gap-1">
          {(["low", "medium", "high"] as TodoPriority[]).map(p => (
            <button key={p}
              onClick={e => { e.stopPropagation(); setNewPriority(prev => prev === p ? undefined : p); }}
              style={{ width: "7px", height: "7px", borderRadius: "50%", background: PRIORITY_CONFIG[p].color, opacity: newPriority === p ? 1 : 0.3, transition: "opacity 0.15s", cursor: "pointer" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string, todayLabel: string, tomorrowLabel: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return todayLabel;
  if (d.toDateString() === tomorrow.toDateString()) return tomorrowLabel;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CalendarWidget({ c }: { c: C }) {
  const t = useTranslation();
  const lang = useSettingsStore(s => s.language);
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const { events, addEvent, removeEvent } = useCalendarStore();
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTime, setFormTime] = useState("");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const monthName = new Date(year, month, 1).toLocaleString(locale, { month: "long" });
  const dayAbbr = Array.from({ length: 7 }, (_, i) =>
    new Date(2025, 0, 6 + i).toLocaleString(locale, { weekday: "short" })
  );

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = today.toISOString().slice(0, 10);

  const eventDays = new Set(
    events
      .filter(e => {
        const ed = new Date(e.date + "T00:00:00");
        return ed.getMonth() === month && ed.getFullYear() === year;
      })
      .map(e => parseInt(e.date.slice(8, 10), 10))
  );

  const upcoming = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
    .slice(0, 3);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;
    addEvent({ title: formTitle.trim(), date: formDate, time: formTime || undefined });
    setFormTitle("");
    setFormTime("");
    setShowAddForm(false);
  };

  return (
    <div className="p-4 h-full flex flex-col" style={{ gap: "6px" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>{t.w_calendar}</div>
          <div style={{ color: c.text, fontSize: "13px", fontWeight: 700 }}>{monthName} {year}</div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(77,168,218,0.08)", color: c.textMuted }}>
            <ChevronLeft size={13} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(77,168,218,0.08)", color: c.textMuted }}>
            <ChevronRight size={13} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            onClick={() => setShowAddForm(v => !v)}
            className="rounded-lg px-2 py-1 flex items-center gap-1"
            style={{ background: showAddForm ? `rgba(0,124,199,0.2)` : "rgba(77,168,218,0.08)", border: `1px solid ${showAddForm ? c.primary + "40" : "transparent"}`, color: c.secondary, fontSize: "10px", fontWeight: 700 }}>
            <Plus size={10} />
            {t.cal_add}
          </motion.button>
        </div>
      </div>

      {/* Add event form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleAddEvent}
            className="flex flex-col gap-1.5 overflow-hidden flex-shrink-0"
          >
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder={t.cal_event_placeholder}
              className="rounded-xl px-3 py-1.5 outline-none bg-transparent"
              style={{ color: c.text, fontSize: "11.5px", border: `1px solid ${c.border}`, background: "rgba(77,168,218,0.06)" }}
              autoFocus
            />
            <div className="flex gap-1.5">
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="flex-1 rounded-xl px-2 py-1.5 outline-none bg-transparent"
                style={{ color: c.text, fontSize: "11px", border: `1px solid ${c.border}`, background: "rgba(77,168,218,0.06)" }}
              />
              <input
                type="time"
                value={formTime}
                onChange={e => setFormTime(e.target.value)}
                className="w-24 rounded-xl px-2 py-1.5 outline-none bg-transparent"
                style={{ color: c.text, fontSize: "11px", border: `1px solid ${c.border}`, background: "rgba(77,168,218,0.06)" }}
              />
              <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="rounded-xl px-3"
                style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "11px", fontWeight: 700 }}>
                {t.cal_save}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Day headers */}
      <div className="grid grid-cols-7 flex-shrink-0" style={{ gap: "2px" }}>
        {dayAbbr.map(d => (
          <div key={d} style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 700, textAlign: "center", padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-shrink-0" style={{ gap: "2px" }}>
        {cells.map((day, idx) => (
          <div key={idx}
            className="relative flex flex-col items-center justify-center rounded-lg"
            style={{
              aspectRatio: "1",
              background: day && isToday(day) ? `linear-gradient(135deg, ${c.primary}, ${c.secondary})` : day ? "rgba(77,168,218,0.04)" : "transparent",
              border: day && !isToday(day) ? `1px solid ${c.border}` : "none",
              cursor: day ? "pointer" : "default",
            }}
          >
            {day && (
              <>
                <span style={{
                  fontSize: "10.5px", fontWeight: isToday(day) ? 800 : 500,
                  color: isToday(day) ? "white" : c.textMuted,
                  lineHeight: 1,
                }}>
                  {day}
                </span>
                {eventDays.has(day) && (
                  <div style={{
                    width: "4px", height: "4px", borderRadius: "50%",
                    background: isToday(day) ? "rgba(255,255,255,0.8)" : c.secondary,
                    marginTop: "2px",
                  }} />
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
        {upcoming.length === 0 ? (
          <div className="flex items-center gap-2 py-2">
            <CalendarIcon size={13} style={{ color: c.textSubtle, opacity: 0.5 }} />
            <span style={{ color: c.textSubtle, fontSize: "11px" }}>{t.cal_no_events}</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {upcoming.map(ev => (
              <motion.div key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="group flex items-center gap-2 rounded-xl px-2 py-1.5"
                style={{ transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(77,168,218,0.07)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
              >
                <div style={{ width: "3px", height: "28px", borderRadius: "2px", background: `linear-gradient(180deg, ${c.primary}, ${c.secondary})`, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div style={{ color: c.text, fontSize: "11.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                  <div style={{ color: c.textSubtle, fontSize: "9.5px" }}>
                    {formatEventDate(ev.date, t.cal_today, t.cal_tomorrow)}{ev.time ? ` · ${ev.time}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => removeEvent(ev.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: c.textSubtle }}
                >
                  <X size={10} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NOTES ────────────────────────────────────────────────────────────────────

function renderInlineMarkdown(text: string, c: C): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
    const firstBold = boldMatch ? remaining.indexOf("**") : Infinity;
    const firstCode = codeMatch ? remaining.indexOf("`") : Infinity;

    if (boldMatch && firstBold < firstCode) {
      if (boldMatch[1]) segments.push(<span key={key++}>{boldMatch[1]}</span>);
      segments.push(<strong key={key++} style={{ color: c.text, fontWeight: 700 }}>{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
    } else if (codeMatch && firstCode < firstBold) {
      if (codeMatch[1]) segments.push(<span key={key++}>{codeMatch[1]}</span>);
      segments.push(
        <code key={key++} style={{
          background: "rgba(77,168,218,0.12)", color: c.secondary,
          borderRadius: "4px", padding: "0 4px", fontSize: "0.9em",
          fontFamily: "monospace",
        }}>{codeMatch[2]}</code>
      );
      remaining = codeMatch[3];
    } else {
      segments.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }
  return segments;
}

function renderMarkdownLite(content: string, c: C): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let nodeKey = 0;

  // Split on fenced code blocks first: ```...```
  const fenceParts = content.split(/(```[\s\S]*?```)/g);

  fenceParts.forEach((part) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const inner = part.slice(3, -3);
      // Strip optional language tag from first line
      const lines = inner.split("\n");
      const firstLine = lines[0].trim();
      const codeLines = firstLine.match(/^[a-zA-Z0-9]+$/) ? lines.slice(1) : lines;
      const codeText = codeLines.join("\n").replace(/^\n/, "").replace(/\n$/, "");
      result.push(
        <pre key={nodeKey++}
          style={{
            background: "rgba(77,168,218,0.08)", border: `1px solid rgba(77,168,218,0.15)`,
            borderRadius: "8px", padding: "8px 10px", margin: "4px 0",
            fontFamily: "monospace", fontSize: "11px", color: c.secondary,
            overflowX: "auto", whiteSpace: "pre",
          }}
        >
          <code>{codeText}</code>
        </pre>
      );
    } else {
      part.split("\n").forEach((line, i) => {
        const isBullet = line.startsWith("- ") || line.startsWith("• ");
        const rawText = isBullet ? line.slice(2) : line;
        const segments = renderInlineMarkdown(rawText, c);

        if (isBullet) {
          result.push(
            <div key={`${nodeKey++}-${i}`} className="flex gap-1.5 leading-snug">
              <span style={{ color: c.secondary, flexShrink: 0, marginTop: "1px", fontSize: "10px" }}>•</span>
              <span style={{ color: c.textMuted, fontSize: "12px" }}>{segments}</span>
            </div>
          );
        } else {
          result.push(
            <div key={`${nodeKey++}-${i}`} style={{ color: line === "" ? undefined : c.textMuted, fontSize: "12px", lineHeight: 1.5, minHeight: line === "" ? "8px" : undefined }}>
              {segments}
            </div>
          );
        }
      });
    }
  });

  return result;
}

export function NotesWidget({ c }: { c: C }) {
  const t = useTranslation();
  const { notes, activeNoteId, addNote, removeNote, updateNote, setActiveNote } = useNotesStore();
  const [editMode, setEditMode] = useState(true);
  const activeNote = notes.find(n => n.id === activeNoteId) ?? notes[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = activeNote ? activeNote.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = activeNote ? activeNote.content.length : 0;

  const handleContentChange = useCallback((val: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, { content: val });
  }, [activeNote, updateNote]);

  return (
    <div className="p-4 h-full flex flex-col" style={{ gap: "6px" }}>
      {/* Tab strip */}
      <div className="flex items-center gap-1 flex-shrink-0 overflow-x-auto no-scrollbar">
        {notes.map(note => (
          <div key={note.id} className="group relative flex-shrink-0">
            <button
              onClick={() => setActiveNote(note.id)}
              className="rounded-lg px-2.5 py-1 flex items-center gap-1"
              style={{
                background: note.id === activeNoteId ? `rgba(0,124,199,0.18)` : "rgba(77,168,218,0.06)",
                border: `1px solid ${note.id === activeNoteId ? c.primary + "40" : c.border}`,
                color: note.id === activeNoteId ? c.secondary : c.textMuted,
                fontSize: "10px", fontWeight: 600,
                transition: "all 0.14s",
                maxWidth: "90px",
              }}
            >
              <FileText size={9} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {note.title}
              </span>
            </button>
            {notes.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); removeNote(note.id); }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex"
                style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}
              >
                <X size={7} />
              </button>
            )}
          </div>
        ))}
        {notes.length < 5 && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={addNote}
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textSubtle }}>
            <Plus size={11} />
          </motion.button>
        )}
        <div className="ml-auto flex-shrink-0 flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            onClick={() => setEditMode(v => !v)}
            className="rounded-lg px-2 py-0.5"
            style={{ background: editMode ? "transparent" : `rgba(0,124,199,0.15)`, border: `1px solid ${c.border}`, color: editMode ? c.textSubtle : c.secondary, fontSize: "9px", fontWeight: 700 }}
          >
            {editMode ? t.notes_preview : t.notes_edit}
          </motion.button>
        </div>
      </div>

      {/* Note title (editable) */}
      {activeNote && (
        <input
          value={activeNote.title}
          onChange={e => updateNote(activeNote.id, { title: e.target.value })}
          className="bg-transparent outline-none flex-shrink-0 w-full"
          style={{ color: c.text, fontSize: "13px", fontWeight: 700, border: "none", fontFamily: "'Sofia Sans', sans-serif" }}
          placeholder={t.notes_title_placeholder}
          onClick={e => e.stopPropagation()}
        />
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 relative">
        {activeNote && editMode ? (
          <textarea
            ref={textareaRef}
            value={activeNote.content}
            onChange={e => handleContentChange(e.target.value)}
            className="absolute inset-0 w-full h-full bg-transparent outline-none resize-none no-scrollbar"
            style={{
              color: c.textMuted, fontSize: "12px", lineHeight: "1.6",
              fontFamily: "'Sofia Sans', monospace", border: "none",
            }}
            placeholder={t.notes_content_placeholder}
            onClick={e => e.stopPropagation()}
          />
        ) : activeNote ? (
          <div className="absolute inset-0 overflow-y-auto no-scrollbar">
            {renderMarkdownLite(activeNote.content || t.notes_empty_preview, c)}
          </div>
        ) : null}
      </div>

      {/* Footer: word/char count */}
      <div className="flex items-center justify-between flex-shrink-0"
        style={{ borderTop: `1px solid ${c.border}`, paddingTop: "4px" }}>
        <div className="flex gap-3">
          <span style={{ color: c.textSubtle, fontSize: "9.5px" }}>{wordCount} {t.notes_words}</span>
          <span style={{ color: c.textSubtle, fontSize: "9.5px" }}>{charCount} {t.notes_chars}</span>
        </div>
        <span style={{ color: c.textSubtle, fontSize: "9px", opacity: 0.6 }}>{t.notes_auto_saved}</span>
      </div>
    </div>
  );
}

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────

const BOOKMARK_COLORS = ["#007CC7", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981", "#ef4444", "#6366f1"];

export function BookmarksWidget({ c }: { c: C }) {
  const t = useTranslation();
  const { bookmarks, add, remove } = useBookmarksStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [tag, setTag] = useState("");
  const [tc, setTc] = useState(BOOKMARK_COLORS[0]);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    const href = url.startsWith("http") ? url.trim() : `https://${url.trim()}`;
    add({ title: title.trim(), url: url.replace(/^https?:\/\//, ""), tag: tag.trim() || "Link", tc, href });
    setTitle(""); setUrl(""); setTag(""); setTc(BOOKMARK_COLORS[0]); setShowForm(false);
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-2">
        <div style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>
          {t.w_bookmarks}
        </div>
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
          onClick={() => setShowForm(v => !v)}
          style={{ color: c.textSubtle, fontSize: "10px", fontWeight: 700, cursor: "pointer", background: "none", border: "none", padding: "0 2px" }}
        >
          {showForm ? t.bm_cancel : t.bm_add}
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden mb-2"
          >
            <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(77,168,218,0.05)", border: `1px solid ${c.border}` }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t.bm_title_placeholder}
                className="w-full outline-none rounded-xl px-2.5 py-1.5"
                style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }}
              />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={t.bm_url_placeholder}
                className="w-full outline-none rounded-xl px-2.5 py-1.5"
                style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }}
              />
              <div className="flex gap-2">
                <input
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                  placeholder={t.bm_tag_placeholder}
                  className="flex-1 outline-none rounded-xl px-2.5 py-1.5"
                  style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }}
                />
                <div className="flex gap-1 items-center">
                  {BOOKMARK_COLORS.map(col => (
                    <button
                      key={col}
                      onClick={() => setTc(col)}
                      className="w-4 h-4 rounded-full flex-shrink-0 transition-transform"
                      style={{
                        background: col,
                        transform: tc === col ? "scale(1.3)" : "scale(1)",
                        outline: tc === col ? `2px solid ${col}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(false)}
                  className="rounded-xl px-3 py-1"
                  style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "11px", fontWeight: 600 }}
                >
                  {t.bm_cancel}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleAdd}
                  className="rounded-xl px-3 py-1"
                  style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "11px", fontWeight: 700 }}
                >
                  {t.bm_save}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-0.5">
        {bookmarks.map((bm, i) => (
          <div
            key={bm.href}
            className="relative group"
            onMouseEnter={() => setHoveredHref(bm.href)}
            onMouseLeave={() => setHoveredHref(null)}
          >
            <motion.a
              href={bm.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.28 }}
              whileHover={{ x: 4 }}
              className="flex items-center gap-2.5 cursor-pointer rounded-xl px-2.5 py-2"
              style={{ transition: "background 0.12s", textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(77,168,218,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
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
            </motion.a>
            <AnimatePresence>
              {hoveredHref === bm.href && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.15 }}
                  onClick={e => { e.preventDefault(); remove(bm.href); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.85)", color: "white", zIndex: 10 }}
                  title={t.bm_delete}
                >
                  <X size={9} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BOOKMARK ICON WIDGET ─────────────────────────────────────────────────────

const BM_COLORS = ["#007CC7","#8b5cf6","#f59e0b","#ec4899","#10b981","#ef4444","#6366f1","#f97316","#14b8a6","#a855f7"];

function CustomizePopover({ label, setLabel, href, setHref, icon, setIcon, bgColor, setBgColor, onSave, onClose, c }: {
  label: string; setLabel: (v: string) => void;
  href: string; setHref: (v: string) => void;
  icon: string; setIcon: (v: string) => void;
  bgColor: string; setBgColor: (v: string) => void;
  onSave: () => void; onClose: () => void; c: C;
}) {
  const t = useTranslation();
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9990, backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 260, borderRadius: "18px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px",
          background: "rgba(8,15,23,0.98)",
          border: `1px solid ${c.border}`,
          backdropFilter: "blur(48px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ color: c.text, fontSize: "13px", fontWeight: 700 }}>{t.bmi_widget_title}</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={icon} onChange={e => setIcon(e.target.value)}
            style={{ outline: "none", borderRadius: "10px", padding: "6px 8px", textAlign: "center",
              background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "18px", width: "46px" }} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={t.bm_title_placeholder}
            style={{ flex: 1, outline: "none", borderRadius: "10px", padding: "6px 10px",
              background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }} />
        </div>
        <input value={href} onChange={e => setHref(e.target.value)} placeholder={t.bm_url_placeholder}
          style={{ width: "100%", outline: "none", borderRadius: "10px", padding: "6px 10px", boxSizing: "border-box",
            background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }} />
        <div>
          <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>{t.bm_color}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {BM_COLORS.map(col => (
              <button key={col} onClick={() => setBgColor(col)}
                style={{ width: 20, height: 20, borderRadius: "50%", background: col, border: "none", cursor: "pointer",
                  transform: bgColor === col ? "scale(1.3)" : "scale(1)", outline: bgColor === col ? `2px solid ${col}` : "none", outlineOffset: "2px", transition: "transform 0.15s" }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={onClose}
            style={{ flex: 1, borderRadius: "10px", padding: "7px 0",
              background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
            {t.bm_cancel}
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={onSave}
            style={{ flex: 1, borderRadius: "10px", padding: "7px 0",
              background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, border: "none", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
            {t.bm_save}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export function BookmarkIconWidget({ c, widgetId }: { c: C; widgetId: string }) {
  const t = useTranslation();
  const { icons, updateIcon } = useBookmarkItemsStore();
  const data = icons[widgetId];

  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [icon, setIcon] = useState("🔗");
  const [bgColor, setBgColor] = useState("#007CC7");
  const [containerW, setContainerW] = useState(160);
  const [containerH, setContainerH] = useState(160);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) { setLabel(data.label); setHref(data.href); setIcon(data.icon); setBgColor(data.bgColor); }
  }, [data]);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerW(entry.contentRect.width);
        setContainerH(entry.contentRect.height);
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (!data) return null;

  const handleSave = () => {
    const normalized = href.startsWith("http") ? href : `https://${href}`;
    updateIcon(widgetId, { label, href: normalized, icon, bgColor });
    setEditing(false);
  };

  const small = containerW < 120 || containerH < 100;
  const minDim = Math.min(containerW, containerH);
  const iconBoxSize = small ? Math.max(28, minDim * 0.72) : 56;
  const iconFontSize = small ? iconBoxSize * 0.54 : 28;
  const iconRadius = small ? iconBoxSize * 0.32 : 18;

  return (
    <div
      ref={ref}
      className="w-full h-full flex flex-col items-center justify-center relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.a
        href={data.href}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ textDecoration: "none", gap: small ? 0 : "8px" }}
      >
        <motion.div
          animate={{ boxShadow: hovered ? `0 8px 32px ${data.bgColor}55` : `0 4px 16px ${data.bgColor}22` }}
          transition={{ duration: 0.2 }}
          style={{
            width: iconBoxSize, height: iconBoxSize,
            borderRadius: iconRadius,
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${data.bgColor}cc, ${data.bgColor}88)`,
            border: `1.5px solid ${data.bgColor}44`,
          }}
        >
          <span style={{ fontSize: iconFontSize, lineHeight: 1 }}>{data.icon}</span>
        </motion.div>
        {!small && (
          <span style={{ color: c.text, fontSize: "11px", fontWeight: 600, textAlign: "center", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.label}
          </span>
        )}
      </motion.a>

      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.14 }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); setEditing(v => !v); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg flex items-center justify-center z-20"
            style={{ background: "rgba(8,15,23,0.82)", border: `1px solid ${c.border}`, backdropFilter: "blur(8px)" }}
          >
            <Settings2 size={11} style={{ color: c.textMuted }} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <CustomizePopover
            label={label} setLabel={setLabel}
            href={href} setHref={setHref}
            icon={icon} setIcon={setIcon}
            bgColor={bgColor} setBgColor={setBgColor}
            onSave={handleSave}
            onClose={() => setEditing(false)}
            c={c}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BOOKMARK FOLDER WIDGET ───────────────────────────────────────────────────

function FolderCustomizePopover({ label, setLabel, icon, setIcon, bgColor, setBgColor, onSave, onClose, c }: {
  label: string; setLabel: (v: string) => void;
  icon: string; setIcon: (v: string) => void;
  bgColor: string; setBgColor: (v: string) => void;
  onSave: () => void; onClose: () => void; c: C;
}) {
  const t = useTranslation();
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9990, backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 240, borderRadius: "18px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px",
          background: "rgba(8,15,23,0.98)",
          border: `1px solid ${c.border}`,
          backdropFilter: "blur(48px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ color: c.text, fontSize: "13px", fontWeight: 700 }}>{t.bmf_widget_title}</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={icon} onChange={e => setIcon(e.target.value)}
            style={{ outline: "none", borderRadius: "10px", padding: "6px 8px", textAlign: "center",
              background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "18px", width: "46px" }} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={t.bmf_name_placeholder}
            style={{ flex: 1, outline: "none", borderRadius: "10px", padding: "6px 10px",
              background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }} />
        </div>
        <div>
          <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>{t.bm_color}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {BM_COLORS.map(col => (
              <button key={col} onClick={() => setBgColor(col)}
                style={{ width: 20, height: 20, borderRadius: "50%", background: col, border: "none", cursor: "pointer",
                  transform: bgColor === col ? "scale(1.3)" : "scale(1)", outline: bgColor === col ? `2px solid ${col}` : "none", outlineOffset: "2px", transition: "transform 0.15s" }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={onClose}
            style={{ flex: 1, borderRadius: "10px", padding: "7px 0",
              background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
            {t.bm_cancel}
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={onSave}
            style={{ flex: 1, borderRadius: "10px", padding: "7px 0",
              background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, border: "none", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
            {t.bm_save}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function FolderPanel({ data, widgetId, onClose, c }: { data: BookmarkFolderData; widgetId: string; onClose: () => void; c: C }) {
  const t = useTranslation();
  const { addItemToFolder, removeItemFromFolder } = useBookmarkItemsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("🔗");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const href = newUrl.startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`;
    addItemToFolder(widgetId, { label: newLabel.trim(), href, icon: newIcon.trim() || "🔗", bgColor: data.bgColor });
    setNewLabel(""); setNewUrl(""); setNewIcon("🔗"); setShowAdd(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 10 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 flex items-center justify-center z-[9990]"
      style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <motion.div
        className="relative rounded-[28px] p-5"
        style={{
          background: "rgba(8,15,23,0.97)",
          border: `1px solid ${c.border}`,
          backdropFilter: "blur(40px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          width: "min(400px, 90vw)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${data.bgColor}cc, ${data.bgColor}66)` }}>
            <span style={{ fontSize: "22px" }}>{data.icon}</span>
          </div>
          <div>
            <div style={{ color: c.text, fontSize: "16px", fontWeight: 700 }}>{data.label}</div>
            <div style={{ color: c.textSubtle, fontSize: "11px" }}>{t.bmf_items(data.items.length)}</div>
          </div>
          <div className="flex-1" />
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}` }}>
            <X size={12} style={{ color: c.textMuted }} />
          </motion.button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {data.items.map(item => (
            <div key={item.id} className="relative"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}>
              <motion.a href={item.href} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.94 }}
                className="flex flex-col items-center gap-1.5 rounded-2xl p-3 cursor-pointer"
                style={{ background: "rgba(77,168,218,0.05)", border: `1px solid ${c.border}`, textDecoration: "none" }}>
                <span style={{ fontSize: "20px", lineHeight: 1 }}>{item.icon}</span>
                <span style={{ color: c.textMuted, fontSize: "10px", fontWeight: 600, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
              </motion.a>
              <AnimatePresence>
                {hoveredId === item.id && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => removeItemFromFolder(widgetId, item.id)}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.9)", color: "white", zIndex: 10 }}>
                    <X size={7} strokeWidth={3} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-3">
              <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(77,168,218,0.04)", border: `1px solid ${c.border}` }}>
                <div className="flex gap-2">
                  <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="🔗"
                    className="outline-none rounded-xl px-2 py-1.5 text-center"
                    style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "16px", width: "44px" }} />
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={t.ql_label_placeholder}
                    className="flex-1 outline-none rounded-xl px-2.5 py-1.5"
                    style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }} />
                </div>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder={t.ql_url_placeholder}
                  onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                  className="w-full outline-none rounded-xl px-2.5 py-1.5"
                  style={{ background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, color: c.text, fontSize: "11px" }} />
                <div className="flex gap-2 justify-end">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={() => setShowAdd(false)}
                    className="rounded-xl px-3 py-1"
                    style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textMuted, fontSize: "11px", fontWeight: 600 }}>
                    {t.bm_cancel}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={handleAdd}
                    className="rounded-xl px-3 py-1"
                    style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", fontSize: "11px", fontWeight: 700 }}>
                    {t.ql_save}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(v => !v)}
          className="w-full rounded-2xl py-2 flex items-center justify-center gap-2"
          style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}`, color: c.textSubtle, fontSize: "11px", fontWeight: 700 }}>
          <Plus size={12} />
          {t.bmf_add_link}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export function BookmarkFolderWidget({ c, widgetId }: { c: C; widgetId: string }) {
  const t = useTranslation();
  const { folders, updateFolder } = useBookmarkItemsStore();
  const data = folders[widgetId];

  const [hovered, setHovered] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📁");
  const [bgColor, setBgColor] = useState("#007CC7");
  const ref = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(160);
  const [containerH, setContainerH] = useState(160);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setContainerW(r.width);
      setContainerH(r.height);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (data) { setLabel(data.label); setIcon(data.icon); setBgColor(data.bgColor); }
  }, [data]);

  useEffect(() => {
    if (!editingMeta) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setEditingMeta(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editingMeta]);

  if (!data) return null;

  const handleSaveMeta = () => {
    updateFolder(widgetId, { label, icon, bgColor });
    setEditingMeta(false);
  };

  const fSmall = containerW < 120 || containerH < 100;
  const fMinDim = Math.min(containerW, containerH);
  const fBoxSize = fSmall ? Math.max(28, fMinDim * 0.72) : 56;
  const fFontSize = fSmall ? fBoxSize * 0.54 : 28;
  const fRadius = fSmall ? fBoxSize * 0.32 : 20;
  const fBadgeSize = fSmall ? Math.max(10, fBoxSize * 0.22) : 16;

  return (
    <div
      ref={ref}
      className="w-full h-full flex flex-col items-center justify-center relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setFolderOpen(true)}
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ background: "none", border: "none", gap: fSmall ? 0 : "8px" }}
      >
        <motion.div
          animate={{ boxShadow: hovered ? `0 8px 32px ${data.bgColor}55` : `0 4px 16px ${data.bgColor}22` }}
          transition={{ duration: 0.2 }}
          style={{
            width: fBoxSize, height: fBoxSize, borderRadius: fRadius,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative",
            background: `linear-gradient(135deg, ${data.bgColor}cc, ${data.bgColor}66)`,
            border: `1.5px solid ${data.bgColor}44`,
          }}
        >
          <span style={{ fontSize: fFontSize, lineHeight: 1 }}>{data.icon}</span>
          {data.items.length > 0 && (
            <div style={{
              position: "absolute", top: -(fBadgeSize * 0.3), right: -(fBadgeSize * 0.3),
              width: fBadgeSize, height: fBadgeSize, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: data.bgColor, border: "2px solid rgba(8,15,23,0.95)",
              fontSize: Math.max(6, fBadgeSize * 0.55) + "px", fontWeight: 800, color: "white",
            }}>
              {data.items.length > 9 ? "9+" : data.items.length}
            </div>
          )}
        </motion.div>
        {!fSmall && (
          <>
            <span style={{ color: c.text, fontSize: "11px", fontWeight: 600, textAlign: "center", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.label}
            </span>
            <span style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 500 }}>{t.bmf_items(data.items.length)}</span>
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.14 }}
            onClick={e => { e.preventDefault(); setEditingMeta(v => !v); }}
            className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center z-20"
            style={{ background: "rgba(8,15,23,0.75)", border: `1px solid ${c.border}`, backdropFilter: "blur(8px)" }}
          >
            <Settings2 size={11} style={{ color: c.textMuted }} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMeta && (
          <FolderCustomizePopover
            label={label} setLabel={setLabel}
            icon={icon} setIcon={setIcon}
            bgColor={bgColor} setBgColor={setBgColor}
            onSave={handleSaveMeta}
            onClose={() => setEditingMeta(false)}
            c={c}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {folderOpen && (
          <FolderPanel data={data} widgetId={widgetId} onClose={() => setFolderOpen(false)} c={c} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── STAT ROW ─────────────────────────────────────────────────────────────────

// ─── POMODORO TIMER ───────────────────────────────────────────────────────────

const CURRENCIES = ["USD", "EUR", "GBP", "RUB", "JPY", "CNY", "BTC", "ETH"] as const;

function playBeep(frequency = 880, duration = 0.25) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  } catch {}
}

export function PomodoroWidget({ c }: { c: C }) {
  const t = useTranslation();
  const {
    phase, secondsLeft, running, sessionCount,
    workDuration, breakDuration, longBreakDuration, longBreakInterval,
    start, pause, reset, tick, advancePhase,
    setWorkDuration, setBreakDuration, setLongBreakDuration, setLongBreakInterval,
  } = usePomodoroStore();

  const [showSettings, setShowSettings] = useState(false);
  const prevRunning = useRef(running);
  const prevSeconds = useRef(secondsLeft);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => { tick(); }, 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  useEffect(() => {
    if (prevSeconds.current > 0 && secondsLeft === 0 && prevRunning.current) {
      playBeep();
    }
    prevSeconds.current = secondsLeft;
    prevRunning.current = running;
  }, [secondsLeft, running]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " ") {
        e.preventDefault();
        if (usePomodoroStore.getState().running) pause();
        else start();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        reset();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        advancePhase();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [start, pause, reset, advancePhase]);

  useEffect(() => {
    const scheduleMidnightReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const ms = tomorrow.getTime() - now.getTime();
      const id = setTimeout(() => {
        const s = usePomodoroStore.getState();
        const today = new Date().toISOString().slice(0, 10);
        if (s.lastResetDate !== today) {
          usePomodoroStore.setState({ sessionCount: 0, lastResetDate: today });
        }
        scheduleMidnightReset();
      }, ms);
      return id;
    };
    const id = scheduleMidnightReset();
    return () => clearTimeout(id);
  }, []);

  const totalSecs = phase === "focus" ? workDuration * 60
    : phase === "longbreak" ? longBreakDuration * 60
    : breakDuration * 60;
  const progress = totalSecs > 0 ? 1 - secondsLeft / totalSecs : 0;

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");

  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeOffset = CIRCUMFERENCE * (1 - progress);

  const phaseColor = phase === "focus" ? c.primary : phase === "break" ? "#22c55e" : "#f59e0b";
  const phaseLabel = phase === "focus" ? t.pomodoro_focus : phase === "break" ? t.pomodoro_break : t.pomodoro_longbreak;

  return (
    <div className="flex flex-col h-full p-4 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${phaseColor}14, transparent 70%)`, filter: "blur(18px)" }} />

      <div className="flex items-start justify-between mb-2">
        <div>
          <div style={{ color: c.textSubtle, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>
            {t.w_pomodoro}
          </div>
          <div style={{ color: phaseColor, fontSize: "12px", fontWeight: 700, marginTop: "1px" }}>{phaseLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ background: `${phaseColor}18`, borderRadius: "10px", padding: "2px 8px", color: phaseColor, fontSize: "10px", fontWeight: 700 }}>
            {t.pomodoro_sessions(sessionCount)}
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(v => !v)}
            style={{ color: c.textSubtle, padding: "4px", borderRadius: "8px", background: showSettings ? "rgba(77,168,218,0.1)" : "none" }}
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showSettings ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="flex-1 space-y-2.5 overflow-y-auto pt-1"
          >
            {([
              { label: t.pomodoro_work_dur, value: workDuration, set: setWorkDuration, min: 1, max: 90 },
              { label: t.pomodoro_break_dur, value: breakDuration, set: setBreakDuration, min: 1, max: 30 },
              { label: t.pomodoro_long_dur, value: longBreakDuration, set: setLongBreakDuration, min: 5, max: 60 },
              { label: t.pomodoro_interval, value: longBreakInterval, set: setLongBreakInterval, min: 1, max: 10, unit: "×" },
            ] as Array<{ label: string; value: number; set: (v: number) => void; min: number; max: number; unit?: string }>).map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span style={{ color: c.textMuted, fontSize: "11px", fontWeight: 600 }}>{row.label}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => row.set(Math.max(row.min, row.value - 1))}
                    style={{ color: c.textMuted, width: 22, height: 22, borderRadius: "6px", background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, fontSize: "14px", lineHeight: 1, cursor: "pointer" }}>−</button>
                  <span style={{ color: c.text, fontSize: "13px", fontWeight: 700, minWidth: 28, textAlign: "center" }}>
                    {row.value}{row.unit ?? ` ${t.pomodoro_min}`}
                  </span>
                  <button type="button" onClick={() => row.set(Math.min(row.max, row.value + 1))}
                    style={{ color: c.textMuted, width: 22, height: 22, borderRadius: "6px", background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`, fontSize: "14px", lineHeight: 1, cursor: "pointer" }}>+</button>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="timer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <div className="relative" style={{ width: 128, height: 128 }}>
              <svg width={128} height={128} viewBox="0 0 128 128" className="absolute inset-0 -rotate-90">
                <circle cx={64} cy={64} r={RADIUS} fill="none" stroke="rgba(77,168,218,0.1)" strokeWidth={8} />
                <motion.circle
                  cx={64} cy={64} r={RADIUS}
                  fill="none"
                  stroke={phaseColor}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  animate={{ strokeDashoffset: strokeOffset }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 6px ${phaseColor}60)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div style={{ fontSize: "30px", fontWeight: 800, fontFamily: "'Sofia Sans', sans-serif", color: c.text, letterSpacing: "-1px", lineHeight: 1 }}>
                  {mins}:{secs}
                </div>
                <div style={{ fontSize: "9.5px", fontWeight: 600, color: phaseColor, marginTop: "3px", letterSpacing: "0.5px" }}>
                  {Math.round(progress * 100)}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                onClick={reset}
                style={{ color: c.textMuted, padding: "6px 10px", borderRadius: "10px", background: "rgba(77,168,218,0.07)", border: `1px solid ${c.border}`, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
              >
                {t.pomodoro_reset}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                onClick={running ? pause : start}
                style={{
                  padding: "6px 18px", borderRadius: "10px",
                  background: running ? "rgba(239,68,68,0.12)" : `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
                  border: running ? "1px solid rgba(239,68,68,0.28)" : "none",
                  color: running ? "#ef4444" : "white",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer",
                }}
              >
                {running ? t.pomodoro_pause : t.pomodoro_start}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                onClick={advancePhase}
                style={{ color: c.textMuted, padding: "6px 10px", borderRadius: "10px", background: "rgba(77,168,218,0.07)", border: `1px solid ${c.border}`, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
              >
                ⏭
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── HABIT TRACKER ────────────────────────────────────────────────────────────

function calcStreak(completions: string[]): number {
  const set = new Set(completions);
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().slice(0, 10);
    if (!set.has(ds)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function HabitRow({ habit, c, today, last7 }: { habit: Habit; c: C; today: string; last7: string[] }) {
  const { toggleToday, removeHabit } = useHabitStore();
  const t = useTranslation();
  const done = habit.completions.includes(today);
  const streak = calcStreak(habit.completions);
  const [hov, setHov] = useState(false);

  return (
    <div
      className="rounded-2xl p-3 transition-all"
      style={{ background: "rgba(77,168,218,0.05)", border: `1px solid ${c.border}` }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <motion.button
          whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }}
          onClick={() => toggleToday(habit.id)}
          style={{
            width: 22, height: 22, borderRadius: "8px", flexShrink: 0,
            border: `2px solid ${done ? c.primary : c.border}`,
            background: done ? `linear-gradient(135deg, ${c.primary}, ${c.secondary})` : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          {done && <Check size={11} strokeWidth={3} style={{ color: "white" }} />}
        </motion.button>
        <span style={{ color: done ? c.textMuted : c.text, fontSize: "13px", fontWeight: 600, flex: 1, textDecoration: done ? "line-through" : "none" }}>
          {habit.label}
        </span>
        {streak > 0 && (
          <span style={{ color: "#f59e0b", fontSize: "10px", fontWeight: 700 }}>
            🔥 {t.habit_streak(streak)}
          </span>
        )}
        <AnimatePresence>
          {hov && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              onClick={() => removeHabit(habit.id)}
              style={{ color: "#ef4444", padding: "2px", borderRadius: "6px", cursor: "pointer", background: "none", border: "none" }}
            >
              <X size={12} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <div className="flex gap-1">
        {last7.map((day) => {
          const completed = habit.completions.includes(day);
          const isToday = day === today;
          return (
            <div key={day} title={day}
              style={{
                flex: 1, height: 8, borderRadius: "3px",
                background: completed ? `linear-gradient(135deg, ${c.primary}, ${c.secondary})` : "rgba(77,168,218,0.1)",
                border: isToday ? `1px solid ${c.secondary}60` : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function HabitWidget({ c }: { c: C }) {
  const t = useTranslation();
  const { habits, addHabit } = useHabitStore();
  const [input, setInput] = useState("");
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const scheduleNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      const id = setTimeout(() => {
        setCurrentDate(new Date().toISOString().slice(0, 10));
        scheduleNextMidnight();
      }, msUntilMidnight);
      return id;
    };
    const id = scheduleNextMidnight();
    return () => clearTimeout(id);
  }, []);

  const today = currentDate;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const handleAdd = () => {
    const label = input.trim();
    if (!label) return;
    addHabit(label);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full p-4 gap-2 relative overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <div style={{ color: c.textSubtle, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>
          {t.w_habit}
        </div>
        <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 600 }}>
          {today}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
        {habits.length === 0 ? (
          <div style={{ color: c.textSubtle, fontSize: "12px", textAlign: "center", padding: "24px 0" }}>
            {t.habit_empty}
          </div>
        ) : (
          habits.map((habit) => (
            <HabitRow key={habit.id} habit={habit} c={c} today={today} last7={last7} />
          ))
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.habit_add_placeholder}
          className="flex-1 outline-none rounded-xl px-3 py-2"
          style={{
            background: "rgba(77,168,218,0.07)",
            border: `1px solid ${c.border}`,
            color: c.text,
            fontSize: "12px",
          }}
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
          style={{
            padding: "6px 14px", borderRadius: "10px",
            background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
            color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", border: "none",
          }}
        >
          {t.habit_add}
        </motion.button>
      </form>
    </div>
  );
}

// ─── CURRENCY CONVERTER ───────────────────────────────────────────────────────

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", RUB: "🇷🇺",
  JPY: "🇯🇵", CNY: "🇨🇳", BTC: "₿", ETH: "Ξ",
};

export function CurrencyWidget({ c }: { c: C }) {
  const t = useTranslation();
  const {
    base, amount, targets, rates, ratesTimestamp, loading, fetchError,
    setBase, setAmount, setTarget, fetchRates,
  } = useCurrencyStore();

  useEffect(() => { fetchRates(); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const amountNum = parseFloat(amount) || 0;
  const ratesDate = ratesTimestamp
    ? new Date(ratesTimestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  function convert(target: string): string {
    if (!rates) return "—";
    const rate = rates[target];
    if (!rate) return "—";
    const result = amountNum * rate;
    if (target === "BTC" || target === "ETH") return result.toFixed(8);
    if (result >= 1000) return result.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return result.toFixed(2);
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 relative overflow-hidden">
      <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.primary}10, transparent 70%)`, filter: "blur(20px)" }} />

      <div className="flex items-center justify-between">
        <div style={{ color: c.textSubtle, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>
          {t.w_currency}
        </div>
        <div className="flex items-center gap-2">
          {ratesDate && !loading && (
            <span style={{ color: c.textSubtle, fontSize: "9px" }}>
              {t.currency_rates_from(ratesDate)}
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => fetchRates(base)}
            style={{ color: c.textSubtle, display: "flex", cursor: "pointer", background: "none", border: "none" }}
          >
            <motion.div animate={loading ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <RefreshCw size={12} />
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
            {t.currency_base}
          </div>
          <select
            value={base}
            onChange={(e) => setBase(e.target.value)}
            style={{
              width: "100%", borderRadius: "10px", padding: "6px 8px",
              background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`,
              color: c.text, fontSize: "12px", fontWeight: 700, outline: "none", cursor: "pointer",
            }}
          >
            {CURRENCIES.map((cc) => (
              <option key={cc} value={cc}>{CURRENCY_FLAGS[cc]} {cc}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
            {t.currency_amount}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="any"
            style={{
              width: "100%", borderRadius: "10px", padding: "6px 8px",
              background: "rgba(77,168,218,0.08)", border: `1px solid ${c.border}`,
              color: c.text, fontSize: "13px", fontWeight: 700, outline: "none",
            }}
          />
        </div>
      </div>

      {loading && !rates && (
        <div style={{ color: c.textMuted, fontSize: "12px", textAlign: "center", padding: "16px 0" }}>
          {t.currency_loading}
        </div>
      )}
      {fetchError && !rates && (
        <div className="flex flex-col items-center gap-2 py-3">
          <span style={{ color: c.textMuted, fontSize: "12px" }}>{t.currency_error}</span>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => fetchRates(base)}
            style={{ fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "8px",
              background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: "white", border: "none", cursor: "pointer" }}
          >
            {t.currency_retry}
          </motion.button>
        </div>
      )}

      {(rates || fetchError) && (
        <div className="flex flex-col gap-2 flex-1">
          {(targets as string[]).map((target, idx) => {
            const converted = convert(target);
            return (
              <div key={idx}
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "rgba(77,168,218,0.06)", border: `1px solid ${c.border}` }}
              >
                <select
                  value={target}
                  onChange={(e) => setTarget(idx as 0 | 1 | 2, e.target.value)}
                  style={{
                    borderRadius: "8px", padding: "3px 6px",
                    background: "rgba(77,168,218,0.1)", border: `1px solid ${c.border}`,
                    color: c.text, fontSize: "11px", fontWeight: 700, outline: "none", cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {CURRENCIES.map((cc) => (
                    <option key={cc} value={cc}>{CURRENCY_FLAGS[cc]} {cc}</option>
                  ))}
                </select>
                <div className="flex-1 min-w-0">
                  <div style={{ color: c.text, fontSize: "16px", fontWeight: 800, fontFamily: "'Sofia Sans', sans-serif", letterSpacing: "-0.3px" }}>
                    {converted}
                  </div>
                  {rates && (
                    <div style={{ color: c.textSubtle, fontSize: "9px", fontWeight: 500 }}>
                      1 {base} = {rates[target]?.toFixed(target === "BTC" || target === "ETH" ? 8 : 4) ?? "—"} {target}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StatRow({ c }: { c: C }) {
  const t = useTranslation();
  const stats = [
    { label: t.stat_streak,     value: t.stat_streak_value, trend: "up" as const },
    { label: t.stat_focus,      value: t.stat_focus_value,  trend: "up" as const },
    { label: t.stat_tasks_done, value: "42" },
    { label: t.stat_bookmarks,  value: "128" },
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
