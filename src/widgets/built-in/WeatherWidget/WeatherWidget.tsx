import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CloudSun,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Cloud,
  Wind,
  Droplets,
  Thermometer,
} from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { Skeleton } from '@/ui/feedback/Skeleton';
import { cn } from '@/ui/lib/cn';
import type { WeatherData, WeatherSettings, HourlyForecastItem } from './types';

// Координаты основных городов
const CITY_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
  москва: { lat: 55.7558, lon: 37.6173, name: 'Москва' },
  moscow: { lat: 55.7558, lon: 37.6173, name: 'Москва' },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351, name: 'Санкт-Петербург' },
  лондон: { lat: 51.5074, lon: -0.1278, name: 'Лондон' },
  london: { lat: 51.5074, lon: -0.1278, name: 'London' },
  'new york': { lat: 40.7128, lon: -74.006, name: 'Нью-Йорк' },
  токио: { lat: 35.6762, lon: 139.6503, name: 'Токио' },
  tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
  берлин: { lat: 52.52, lon: 13.405, name: 'Берлин' },
  berlin: { lat: 52.52, lon: 13.405, name: 'Berlin' },
  париж: { lat: 48.8566, lon: 2.3522, name: 'Париж' },
  paris: { lat: 48.8566, lon: 2.3522, name: 'Paris' },
  дубай: { lat: 25.2048, lon: 55.2708, name: 'Дубай' },
  dubai: { lat: 25.2048, lon: 55.2708, name: 'Dubai' },
};

const fetchWeatherApi = async (cityName: string): Promise<WeatherData> => {
  const normalized = cityName.trim().toLowerCase();
  const coords = CITY_COORDINATES[normalized] || { lat: 55.7558, lon: 37.6173, name: cityName };

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,weathercode,relative_humidity_2m,apparent_temperature,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API weather request failed');
    const data = await res.json();

    // Формируем почасовой прогноз на ближайшие 6 часов
    const nowHour = new Date().getHours();
    const hourlyList: HourlyForecastItem[] = [];
    if (data.hourly?.time && Array.isArray(data.hourly.time)) {
      for (let i = 0; i < 6; i++) {
        const index = nowHour + i;
        if (data.hourly.time[index]) {
          const rawTime = data.hourly.time[index];
          const timeLabel = rawTime.split('T')[1]?.slice(0, 5) || `${index}:00`;
          hourlyList.push({
            time: timeLabel,
            temp: Math.round(data.hourly.temperature_2m[index] ?? data.current_weather.temperature),
            code: data.hourly.weathercode[index] ?? 0,
          });
        }
      }
    }

    const currentHumidity = data.hourly?.relative_humidity_2m?.[nowHour] ?? 65;
    const currentFeelsLike = Math.round(data.hourly?.apparent_temperature?.[nowHour] ?? data.current_weather.temperature);
    const currentWind = Math.round(data.current_weather.windspeed ?? 3.5);

    const result: WeatherData = {
      temperature: Math.round(data.current_weather.temperature),
      weathercode: data.current_weather.weathercode,
      city: coords.name,
      maxTemp: Math.round(data.daily.temperature_2m_max[0]),
      minTemp: Math.round(data.daily.temperature_2m_min[0]),
      feelsLike: currentFeelsLike,
      humidity: currentHumidity,
      windSpeed: currentWind,
      hourly: hourlyList,
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
  const [viewTab, setViewTab] = useState<'current' | 'hourly'>('current');

  const { data, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['weather', city],
    queryFn: () => fetchWeatherApi(city),
    staleTime: 1000 * 60 * 30, // 30 минут
  });

  const getWeatherIcon = (code?: number, sizeClass = 'w-9 h-9') => {
    if (code === undefined) return <CloudSun className={cn(sizeClass, 'text-secondary')} />;
    if (code === 0) return <Sun className={cn(sizeClass, 'text-warning')} />;
    if (code >= 1 && code <= 3) return <CloudSun className={cn(sizeClass, 'text-primary')} />;
    if (code >= 51 && code <= 67) return <CloudRain className={cn(sizeClass, 'text-secondary')} />;
    if (code >= 71 && code <= 77) return <CloudSnow className={cn(sizeClass, 'text-primary')} />;
    if (code >= 95) return <CloudLightning className={cn(sizeClass, 'text-accent')} />;
    return <Cloud className={cn(sizeClass, 'text-fg-muted')} />;
  };

  const getWeatherDescription = (code?: number) => {
    if (code === undefined) return 'Облачно';
    if (code === 0) return 'Ясно';
    if (code >= 1 && code <= 3) return 'Переменная облачность';
    if (code >= 51 && code <= 67) return 'Дождь';
    if (code >= 71 && code <= 77) return 'Снег';
    if (code >= 95) return 'Гроза';
    return 'Облачно';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-around h-full p-3">
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
      <div className="flex items-center justify-around h-full p-3">
        <div>
          <span className="text-3xl font-bold text-fg">+20°C</span>
          <p className="text-xs text-fg-muted">Москва (Офлайн)</p>
        </div>
        <CloudSun className="w-9 h-9 text-secondary" />
      </div>
    );
  }

  const sign = data.temperature > 0 ? '+' : '';

  return (
    <div className="flex flex-col justify-between h-full p-3 select-none">
      {/* Верхний блок: температура, город, статус */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-fg font-sofia">
              {sign}{data.temperature}°C
            </span>
            {data.feelsLike !== undefined && (
              <span className="text-xs text-fg-muted hidden sm:inline">
                Ощущается как {data.feelsLike > 0 ? '+' : ''}{data.feelsLike}°C
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium text-fg">
              {data.city}{data.isOffline ? ' (Офлайн)' : ''}
            </span>
            <span className="text-xs text-fg-dim">• {getWeatherDescription(data.weathercode)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          {getWeatherIcon(data.weathercode, 'w-8 h-8')}
          <span className="text-xs text-fg-muted mt-1 font-mono">
            {data.minTemp}° / {data.maxTemp}°
          </span>
        </div>
      </div>

      {/* Переключатель и детали: Почасовой прогноз / Атмосферные параметры */}
      {viewTab === 'current' ? (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line mt-2">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <Droplets className="w-4 h-4 text-primary shrink-0" />
            <span>Влажность: <strong className="text-fg font-medium">{data.humidity ?? 60}%</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <Wind className="w-4 h-4 text-secondary shrink-0" />
            <span>Ветер: <strong className="text-fg font-medium">{data.windSpeed ?? 3} м/с</strong></span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1 pt-2 border-t border-line mt-2 overflow-x-auto">
          {data.hourly?.slice(0, 4).map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-1">
              <span className="text-[10px] text-fg-muted font-mono">{h.time}</span>
              {getWeatherIcon(h.code, 'w-4 h-4')}
              <span className="text-xs font-semibold text-fg">{h.temp > 0 ? '+' : ''}{h.temp}°</span>
            </div>
          ))}
        </div>
      )}

      {/* Кнопка переключения вида */}
      {data.hourly && data.hourly.length > 0 && (
        <button
          type="button"
          onClick={() => setViewTab(viewTab === 'current' ? 'hourly' : 'current')}
          className="text-[10px] text-fg-dim hover:text-primary transition-colors text-center mt-1 cursor-pointer"
        >
          {viewTab === 'current' ? 'Показать почасовой прогноз →' : '← Показать параметры ветра и влажности'}
        </button>
      )}
    </div>
  );
};
