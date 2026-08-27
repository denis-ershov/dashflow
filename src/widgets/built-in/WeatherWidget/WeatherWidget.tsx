import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudSun, Sun, CloudRain, CloudSnow, CloudLightning, Cloud } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { Skeleton } from '@/ui/feedback/Skeleton';
import type { WeatherData, WeatherSettings } from './types';

// Координаты основных городов
const CITY_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
  москва: { lat: 55.7558, lon: 37.6173, name: 'Москва' },
  moscow: { lat: 55.7558, lon: 37.6173, name: 'Москва' },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351, name: 'Санкт-Петербург' },
  london: { lat: 51.5074, lon: -0.1278, name: 'London' },
  'new york': { lat: 40.7128, lon: -74.006, name: 'New York' },
  tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
  berlin: { lat: 52.52, lon: 13.405, name: 'Berlin' },
  paris: { lat: 48.8566, lon: 2.3522, name: 'Paris' },
  dubai: { lat: 25.2048, lon: 55.2708, name: 'Dubai' },
};

const fetchWeatherApi = async (cityName: string): Promise<WeatherData> => {
  const normalized = cityName.trim().toLowerCase();
  const coords = CITY_COORDINATES[normalized] || { lat: 55.7558, lon: 37.6173, name: cityName };

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API weather request failed');
    const data = await res.json();

    const result: WeatherData = {
      temperature: Math.round(data.current_weather.temperature),
      weathercode: data.current_weather.weathercode,
      city: coords.name,
      maxTemp: Math.round(data.daily.temperature_2m_max[0]),
      minTemp: Math.round(data.daily.temperature_2m_min[0]),
      isOffline: false,
    };

    try {
      await StorageAdapter.setLarge(STORAGE_KEYS.WEATHER_CACHE, result);
    } catch {
      // Игнорируем сбой фонового кэширования
    }

    return result;
  } catch (err) {
    // Попытка взять из IndexedDB кеша
    try {
      const cached = await StorageAdapter.getLarge<WeatherData>(STORAGE_KEYS.WEATHER_CACHE);
      if (cached) {
        return { ...cached, isOffline: true };
      }
    } catch {
      // Не удалось прочитать кеш
    }
    throw err;
  }
};

export const WeatherWidget: React.FC<WidgetProps<WeatherSettings>> = ({ settings }) => {
  const city = settings?.city || 'Москва';

  const { data, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['weather', city],
    queryFn: () => fetchWeatherApi(city),
    staleTime: 1000 * 60 * 30, // 30 минут
  });

  const getWeatherIcon = (code?: number) => {
    if (code === undefined) return <CloudSun className="w-9 h-9 text-secondary" />;
    if (code === 0) return <Sun className="w-9 h-9 text-amber-400 animate-spin-slow" />;
    if (code >= 1 && code <= 3) return <CloudSun className="w-9 h-9 text-sky-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-9 h-9 text-blue-400" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="w-9 h-9 text-indigo-300" />;
    if (code >= 95) return <CloudLightning className="w-9 h-9 text-purple-400" />;
    return <Cloud className="w-9 h-9 text-fg-muted" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-around h-full p-2">
        <div className="space-y-2">
          <Skeleton className="w-20 h-8" />
          <Skeleton className="w-28 h-3" />
        </div>
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-around h-full p-2">
        <div>
          <span className="text-3xl font-bold text-fg">+20°C</span>
          <p className="text-xs text-fg-muted">Москва (Офлайн)</p>
        </div>
        <CloudSun className="w-9 h-9 text-amber-400" />
      </div>
    );
  }

  const tempFormatted = data.temperature > 0 ? `+${data.temperature}` : `${data.temperature}`;

  return (
    <div
      aria-live="polite"
      className="flex items-center justify-around h-full select-none p-2"
    >
      <div className="flex flex-col">
        <span className="text-3xl sm:text-4xl font-bold text-fg tracking-tight">
          {tempFormatted}°C
        </span>
        <span className="text-xs text-fg-muted mt-0.5 font-medium">
          {data.city} {data.isOffline ? '(Офлайн)' : ''} • {data.maxTemp}° / {data.minTemp}°
        </span>
      </div>
      <div className="shrink-0">{getWeatherIcon(data.weathercode)}</div>
    </div>
  );
};
