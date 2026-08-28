import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudSun, Sun, CloudRain, CloudSnow, CloudLightning, Cloud, Droplets, Wind } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { Skeleton } from '@/ui/feedback';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { cn } from '@/ui/lib/cn';
import type { WeatherData, WeatherSettings } from './types';

const GEOCODING_MAP: Record<string, { lat: number; lon: number; name: string }> = {
  москва: { lat: 55.7558, lon: 37.6173, name: 'Москва' },
  moscow: { lat: 55.7558, lon: 37.6173, name: 'Москва' },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351, name: 'Санкт-Петербург' },
  spb: { lat: 59.9343, lon: 30.3351, name: 'Санкт-Петербург' },
  лондон: { lat: 51.5074, lon: -0.1278, name: 'Лондон' },
  london: { lat: 51.5074, lon: -0.1278, name: 'London' },
  'нью-йорк': { lat: 40.7128, lon: -74.006, name: 'Нью-Йорк' },
  'new york': { lat: 40.7128, lon: -74.006, name: 'New York' },
  токио: { lat: 35.6762, lon: 139.6503, name: 'Токио' },
  tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
};

const fetchWeatherApi = async (cityName: string): Promise<WeatherData> => {
  const normCity = cityName.trim().toLowerCase();
  let coords = GEOCODING_MAP[normCity];

  if (!coords) {
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ru&format=json`,
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results[0]) {
          coords = {
            lat: geoData.results[0].latitude,
            lon: geoData.results[0].longitude,
            name: geoData.results[0].name,
          };
        }
      }
    } catch {
      // Игнорируем ошибку геокодирования
    }
  }

  if (!coords) {
    coords = { lat: 55.7558, lon: 37.6173, name: cityName || 'Москва' };
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
    );

    if (!res.ok) {
      throw new Error(`Ошибка загрузки данных погоды: ${res.statusText}`);
    }

    const json = await res.json();
    const current = json.current || json.current_weather || {};
    const daily = json.daily || {};
    const hourly = json.hourly || {};

    const currentTemp = Math.round(current.temperature_2m ?? current.temperature ?? 20);
    const code = current.weather_code ?? current.weathercode ?? 0;
    const feels = current.apparent_temperature ? Math.round(current.apparent_temperature) : undefined;
    const currentHumidity = current.relative_humidity_2m ? Math.round(current.relative_humidity_2m) : undefined;
    const currentWind = current.wind_speed_10m ? Math.round(current.wind_speed_10m) : undefined;

    const hourlyList = [];
    if (hourly.time && hourly.temperature_2m) {
      const now = new Date();
      const currentHour = now.getHours();
      for (let i = 0; i < 6; i++) {
        const targetIdx = currentHour + i * 2;
        if (hourly.time[targetIdx]) {
          const timeStr = new Date(hourly.time[targetIdx]).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          });
          hourlyList.push({
            time: timeStr,
            temp: Math.round(hourly.temperature_2m[targetIdx] ?? currentTemp),
            code: hourly.weather_code?.[targetIdx] ?? code,
          });
        }
      }
    }

    const result: WeatherData = {
      temperature: currentTemp,
      weathercode: code,
      city: coords.name,
      maxTemp: daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : currentTemp + 2,
      minTemp: daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : currentTemp - 2,
      feelsLike: feels,
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
  const tempUnit = settings?.tempUnit || 'celsius';
  const showHourly = settings?.showHourly !== false;
  const showFeelsLike = settings?.showFeelsLike !== false;
  const showHumidity = settings?.showHumidity !== false;
  const showWind = settings?.showWind !== false;

  const [viewTab, setViewTab] = useState<'current' | 'hourly'>('current');

  const { data, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['weather', city],
    queryFn: () => fetchWeatherApi(city),
    staleTime: 1000 * 60 * 30, // 30 минут
  });

  const formatTemp = (celsius: number) => {
    if (tempUnit === 'fahrenheit') {
      const f = Math.round(celsius * 1.8 + 32);
      return `${f > 0 ? '+' : ''}${f}°F`;
    }
    return `${celsius > 0 ? '+' : ''}${celsius}°C`;
  };

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
          <span className="text-3xl font-bold text-fg">{formatTemp(20)}</span>
          <p className="text-xs text-fg-muted">Москва (Офлайн)</p>
        </div>
        <CloudSun className="w-9 h-9 text-secondary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between h-full p-2.5 select-none overflow-hidden">
      {/* Верхний блок: температура, город, статус */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-fg font-sofia">
              {formatTemp(data.temperature)}
            </span>
            {showFeelsLike && data.feelsLike !== undefined && (
              <span className="text-[11px] text-fg-muted hidden sm:inline">
                Ощущается как {formatTemp(data.feelsLike)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-medium text-fg">
              {data.city}{data.isOffline ? ' (Офлайн)' : ''}
            </span>
            <span className="text-[11px] text-fg-dim truncate max-w-[120px]">• {getWeatherDescription(data.weathercode)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          {getWeatherIcon(data.weathercode, 'w-7 h-7 sm:w-8 sm:h-8')}
          <span className="text-[11px] text-fg-muted mt-0.5 font-mono">
            {data.minTemp}° / {data.maxTemp}°
          </span>
        </div>
      </div>

      {/* Переключатель и детали: Почасовой прогноз / Атмосферные параметры */}
      {viewTab === 'current' ? (
        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-line mt-1">
          {showHumidity && (
            <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <Droplets className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Влажн: <strong className="text-fg font-medium">{data.humidity ?? 60}%</strong></span>
            </div>
          )}
          {showWind && (
            <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <Wind className="w-3.5 h-3.5 text-secondary shrink-0" />
              <span>Ветер: <strong className="text-fg font-medium">{data.windSpeed ?? 3} м/с</strong></span>
            </div>
          )}
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
      {showHourly && data.hourly && data.hourly.length > 0 && (
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
