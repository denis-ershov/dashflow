/**
 * Weather API integration - Open-Meteo (free, no API key).
 * Geocoding + current weather with caching.
 */

import { storageManager } from '@/storage';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// WMO Weather interpretation codes (simplified)
const WEATHER_LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  77: 'Snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Rain showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
};

export interface WeatherData {
  temp: number;
  humidity: number;
  code: number;
  label: string;
  city: string;
  lat: number;
  lon: number;
  fetchedAt: number;
}

interface CachedWeather {
  data: WeatherData;
  fetchedAt: number;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
}

interface OpenMeteoCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  weather_code: number;
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
}

function getWeatherLabel(code: number): string {
  return WEATHER_LABELS[code] ?? 'Unknown';
}

function cacheKey(lat: number, lon: number): string {
  return `dashflow:weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

async function fetchGeocoding(city: string): Promise<GeocodingResult | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  if (!res.ok) throw new Error('Geocoding failed');
  const json = await res.json();
  const results = json.results as GeocodingResult[] | undefined;
  return results?.[0] ?? null;
}

async function fetchWeather(lat: number, lon: number, city: string): Promise<WeatherData> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`
  );
  if (!res.ok) throw new Error('Weather fetch failed');
  const json = (await res.json()) as OpenMeteoResponse;
  const current = json.current;
  if (!current) throw new Error('No weather data');
  return {
    temp: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    code: current.weather_code,
    label: getWeatherLabel(current.weather_code),
    city,
    lat,
    lon,
    fetchedAt: Date.now(),
  };
}

/** Get cached weather if valid */
async function getCached(key: string): Promise<WeatherData | null> {
  const cached = await storageManager.get<CachedWeather>(key);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached.data;
}

/** Set cache */
async function setCache(key: string, data: WeatherData): Promise<void> {
  await storageManager.set(key, { data, fetchedAt: data.fetchedAt });
}

/**
 * Fetch weather by city name.
 * Uses cache; bypasses cache when forceRefresh is true.
 */
export async function getWeatherByCity(
  city: string,
  instanceId: string,
  forceRefresh = false
): Promise<WeatherData> {
  const geo = await fetchGeocoding(city);
  if (!geo) throw new Error(`Location not found: ${city}`);
  const lat = geo.latitude;
  const lon = geo.longitude;
  const displayCity = `${geo.name}, ${geo.country}`;
  const key = cacheKey(lat, lon);

  if (!forceRefresh) {
    const cached = await getCached(key);
    if (cached) return { ...cached, city: displayCity };
  }

  const data = await fetchWeather(lat, lon, displayCity);
  await setCache(key, data);
  return data;
}

/**
 * Fetch weather by coordinates (e.g. from geolocation).
 */
export async function getWeatherByCoords(
  lat: number,
  lon: number,
  instanceId: string,
  forceRefresh = false
): Promise<WeatherData> {
  const key = cacheKey(lat, lon);

  if (!forceRefresh) {
    const cached = await getCached(key);
    if (cached) return cached;
  }

  const data = await fetchWeather(lat, lon, `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`);
  await setCache(key, data);
  return data;
}
