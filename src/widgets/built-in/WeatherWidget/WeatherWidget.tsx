import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudSun, Sun, CloudRain, CloudSnow, CloudLightning, Cloud } from 'lucide-react';
import { StorageAdapter } from '@/services/storage/StorageAdapter';

export interface WeatherWidgetProps {
  instanceId: string;
}

interface WeatherData {
  temperature: number;
  weathercode: number;
  city: string;
  maxTemp: number;
  minTemp: number;
}

const fetchWeather = async (): Promise<WeatherData> => {
  // Координаты по умолчанию (Москва)
  const lat = 55.7558;
  const lon = 37.6173;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Не удалось загрузить погоду');
  const data = await res.json();

  const weatherData: WeatherData = {
    temperature: Math.round(data.current_weather.temperature),
    weathercode: data.current_weather.weathercode,
    city: 'Москва',
    maxTemp: Math.round(data.daily.temperature_2m_max[0]),
    minTemp: Math.round(data.daily.temperature_2m_min[0]),
  };

  // Кэширование данных в IndexedDB
  await StorageAdapter.setLarge('weather_cache', weatherData);
  return weatherData;
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = () => {
  const { data, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['weather'],
    queryFn: fetchWeather,
    staleTime: 1000 * 60 * 30, // 30 минут
  });

  const getWeatherIcon = (code?: number) => {
    if (code === undefined) return <CloudSun className="w-10 h-10 text-[var(--color-secondary)]" />;
    if (code === 0) return <Sun className="w-10 h-10 text-amber-400" />;
    if (code >= 1 && code <= 3) return <CloudSun className="w-10 h-10 text-sky-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-10 h-10 text-blue-400" />;
    if (code >= 71 && code <= 77) return <CloudSnow className="w-10 h-10 text-indigo-300" />;
    if (code >= 95) return <CloudLightning className="w-10 h-10 text-purple-400" />;
    return <Cloud className="w-10 h-10 text-slate-400" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)] animate-pulse">
        Загрузка погоды...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-around h-full">
        <div>
          <span className="text-3xl font-bold">+22°C</span>
          <p className="text-xs text-[var(--color-text-muted)]">Москва, Ясно (Офлайн)</p>
        </div>
        <CloudSun className="w-10 h-10 text-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-around h-full select-none">
      <div className="flex flex-col">
        <span className="text-3xl sm:text-4xl font-bold text-[var(--color-text)]">
          {data.temperature > 0 ? `+${data.temperature}` : data.temperature}°C
        </span>
        <span className="text-xs text-[var(--color-text-muted)] mt-0.5 font-medium">
          {data.city} • МАКС: {data.maxTemp}° / МИН: {data.minTemp}°
        </span>
      </div>
      <div className="shrink-0">{getWeatherIcon(data.weathercode)}</div>
    </div>
  );
};
