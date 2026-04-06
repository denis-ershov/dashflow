import { useState, useEffect, useCallback, useRef } from "react";
import { getSetting, setSetting, STORAGE_KEYS } from "../store/storage";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface WeatherData {
  city: string;
  country: string;
  temp: number;
  feelsLike: number;
  description: string;
  conditionCode: number;
  icon: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  tempMin: number;
  tempMax: number;
  isNight: boolean;
}

export interface ForecastDay {
  dayOfWeek: number;
  conditionCode: number;
  icon: string;
  tempMin: number;
  tempMax: number;
}

export type WeatherUnit = "C" | "F";

export interface UseWeatherReturn {
  weather: WeatherData | null;
  forecast: ForecastDay[];
  loading: boolean;
  error: string | null;
  unit: WeatherUnit;
  toggleUnit: () => void;
  city: string;
  setCity: (c: string) => void;
  searchCity: (c: string) => Promise<void>;
  hasApiKey: boolean;
  apiKey: string;
  setApiKey: (k: string) => void;
  saveApiKey: (k: string) => Promise<void>;
  geoPermission: "prompt" | "granted" | "denied" | "pending";
  refetch: () => void;
}

// ─── TEMPERATURE CONVERSION ───────────────────────────────────────────────────

export function toDisplay(celsius: number, unit: WeatherUnit): number {
  if (unit === "F") return Math.round(celsius * 9 / 5 + 32);
  return Math.round(celsius);
}

// ─── OWM BASE URL ─────────────────────────────────────────────────────────────

const BASE = "https://api.openweathermap.org/data/2.5";

// Try to read an env-supplied seed key (only in Vite dev/web build)
function envKey(): string {
  try {
    return (import.meta as unknown as { env: { VITE_WEATHER_API_KEY?: string } })
      .env?.VITE_WEATHER_API_KEY ?? "";
  } catch {
    return "";
  }
}

// ─── OWM RAW TYPES ────────────────────────────────────────────────────────────

interface OWMCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface OWMCurrentResponse {
  name: string;
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: OWMCondition[];
  wind: { speed: number };
  visibility: number;
  sys: { country: string; sunrise: number; sunset: number };
}

interface OWMForecastItem {
  dt: number;
  main: { temp: number };
  weather: OWMCondition[];
}

interface OWMForecastResponse {
  list: OWMForecastItem[];
}

// ─── RAW OWM → NORMALIZED ─────────────────────────────────────────────────────

function normalizeWeather(data: OWMCurrentResponse): WeatherData {
  const { dt, sys } = data;
  const isNight = sys?.sunrise && sys?.sunset
    ? (dt < sys.sunrise || dt > sys.sunset)
    : false;
  return {
    city: data.name ?? "Unknown",
    country: sys?.country ?? "",
    temp: data.main.temp,
    feelsLike: data.main.feels_like,
    description: data.weather[0]?.description ?? "",
    conditionCode: data.weather[0]?.id ?? 800,
    icon: data.weather[0]?.icon ?? "01d",
    humidity: data.main.humidity,
    windSpeed: data.wind?.speed ?? 0,
    visibility: data.visibility ?? 10000,
    tempMin: data.main.temp_min,
    tempMax: data.main.temp_max,
    isNight,
  };
}

function normalizeForecast(data: OWMForecastResponse): ForecastDay[] {
  // OWM returns 3-hour intervals; collapse into one entry per calendar day (skip today)
  const byDay = new Map<string, { min: number; max: number; code: number; icon: string; dayOfWeek: number }>();
  const todayDate = new Date().toDateString();

  for (const item of data.list ?? []) {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (key === todayDate) continue;
    const temp = item.main.temp;
    const existing = byDay.get(key);
    if (!existing) {
      byDay.set(key, {
        min: temp,
        max: temp,
        code: item.weather[0]?.id ?? 800,
        icon: item.weather[0]?.icon ?? "01d",
        dayOfWeek: d.getDay(),
      });
    } else {
      existing.min = Math.min(existing.min, temp);
      existing.max = Math.max(existing.max, temp);
    }
  }

  return Array.from(byDay.entries())
    .slice(0, 5)
    .map(([, v]) => ({
      dayOfWeek: v.dayOfWeek,
      conditionCode: v.code,
      icon: v.icon,
      tempMin: v.min,
      tempMax: v.max,
    }));
}

// ─── FRIENDLY ERROR MESSAGES ──────────────────────────────────────────────────

function friendlyFetchError(status: number, context: "key" | "city" | "fetch"): string {
  if (status === 401) return "Invalid API key — please check your OpenWeatherMap key";
  if (status === 404) return context === "city" ? "City not found — try a different name" : "Weather unavailable";
  if (status === 429) return "Too many requests — please try again later";
  if (status >= 500) return "Weather service is temporarily unavailable";
  return "Weather unavailable";
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useWeather(): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<WeatherUnit>("C");
  const [city, setCity] = useState("");
  const [apiKey, setApiKeyState] = useState("");
  const [geoPermission, setGeoPermission] = useState<"prompt" | "granted" | "denied" | "pending">("pending");
  const fetchCounterRef = useRef(0);

  const hasApiKey = apiKey.trim().length > 0;

  // ─ Fetch by coords ──────────────────────────────────────────────────────────

  const fetchByCoords = useCallback(async (lat: number, lon: number, key: string) => {
    const id = ++fetchCounterRef.current;
    setLoading(true);
    setError(null);
    try {
      const [wRes, fRes] = await Promise.all([
        fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`),
        fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric`),
      ]);
      if (!wRes.ok) throw new Error(friendlyFetchError(wRes.status, "fetch"));
      if (!fRes.ok) throw new Error(friendlyFetchError(fRes.status, "fetch"));
      if (id !== fetchCounterRef.current) return;
      const [wData, fData] = await Promise.all([
        wRes.json() as Promise<OWMCurrentResponse>,
        fRes.json() as Promise<OWMForecastResponse>,
      ]);
      if (id !== fetchCounterRef.current) return;
      setWeather(normalizeWeather(wData));
      setForecast(normalizeForecast(fData));
      setCity(wData.name ?? "");
    } catch (e) {
      if (id !== fetchCounterRef.current) return;
      setError(e instanceof Error ? e.message : "Weather unavailable");
    } finally {
      if (id === fetchCounterRef.current) setLoading(false);
    }
  }, []);

  // ─ Fetch by city name ───────────────────────────────────────────────────────

  const fetchByCityName = useCallback(async (cityName: string, key: string) => {
    const id = ++fetchCounterRef.current;
    setLoading(true);
    setError(null);
    try {
      const [wRes, fRes] = await Promise.all([
        fetch(`${BASE}/weather?q=${encodeURIComponent(cityName)}&appid=${key}&units=metric`),
        fetch(`${BASE}/forecast?q=${encodeURIComponent(cityName)}&appid=${key}&units=metric`),
      ]);
      if (!wRes.ok) throw new Error(friendlyFetchError(wRes.status, "city"));
      if (!fRes.ok) throw new Error(friendlyFetchError(fRes.status, "fetch"));
      if (id !== fetchCounterRef.current) return;
      const [wData, fData] = await Promise.all([
        wRes.json() as Promise<OWMCurrentResponse>,
        fRes.json() as Promise<OWMForecastResponse>,
      ]);
      if (id !== fetchCounterRef.current) return;
      const normalized = normalizeWeather(wData);
      setWeather(normalized);
      setForecast(normalizeForecast(fData));
      setCity(normalized.city);
      await setSetting(STORAGE_KEYS.weatherCity, normalized.city);
    } catch (e) {
      if (id !== fetchCounterRef.current) return;
      setError(e instanceof Error ? e.message : "Weather unavailable");
    } finally {
      if (id === fetchCounterRef.current) setLoading(false);
    }
  }, []);

  // ─ Request geolocation ─────────────────────────────────────────────────────

  const requestGeo = useCallback((key: string, fallbackCity: string) => {
    if (!navigator.geolocation) {
      setGeoPermission("denied");
      if (fallbackCity) fetchByCityName(fallbackCity, key);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoPermission("granted");
        fetchByCoords(pos.coords.latitude, pos.coords.longitude, key);
      },
      () => {
        setGeoPermission("denied");
        if (fallbackCity) fetchByCityName(fallbackCity, key);
      },
      { timeout: 8000 }
    );
  }, [fetchByCoords, fetchByCityName]);

  // ─ Init: load settings from storage ────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const [storedKey, storedCity, storedUnit] = await Promise.all([
        getSetting<string>(STORAGE_KEYS.weatherApiKey, ""),
        getSetting<string>(STORAGE_KEYS.weatherCity, ""),
        getSetting<WeatherUnit>(STORAGE_KEYS.weatherUnit, "C"),
      ]);
      if (cancelled) return;

      const key = storedKey || envKey();
      setApiKeyState(key);
      setUnit(storedUnit);
      setCity(storedCity);

      if (!key) return; // wait for user to enter key

      requestGeo(key, storedCity);
    }
    init();
    return () => { cancelled = true; };
  }, [requestGeo]);

  // ─ Public: search city ─────────────────────────────────────────────────────

  const searchCity = useCallback(async (cityName: string) => {
    if (!apiKey || !cityName.trim()) return;
    await fetchByCityName(cityName.trim(), apiKey);
  }, [apiKey, fetchByCityName]);

  // ─ Public: save API key ────────────────────────────────────────────────────

  const saveApiKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    setApiKeyState(trimmed);
    await setSetting(STORAGE_KEYS.weatherApiKey, trimmed);
    if (trimmed) requestGeo(trimmed, city);
  }, [city, requestGeo]);

  // ─ Public: toggle unit ─────────────────────────────────────────────────────

  const toggleUnit = useCallback(() => {
    setUnit(u => {
      const next = u === "C" ? "F" : "C";
      setSetting(STORAGE_KEYS.weatherUnit, next);
      return next;
    });
  }, []);

  // ─ Public: refetch ─────────────────────────────────────────────────────────

  const refetch = useCallback(() => {
    if (!apiKey) return;
    if (geoPermission === "granted" && weather) {
      requestGeo(apiKey, city);
    } else if (city) {
      fetchByCityName(city, apiKey);
    } else {
      requestGeo(apiKey, "");
    }
  }, [apiKey, geoPermission, weather, city, requestGeo, fetchByCityName]);

  return {
    weather,
    forecast,
    loading,
    error,
    unit,
    toggleUnit,
    city,
    setCity,
    searchCity,
    hasApiKey,
    apiKey,
    setApiKey: setApiKeyState,
    saveApiKey,
    geoPermission,
    refetch,
  };
}
