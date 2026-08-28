import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import type {
  CitySearchResult,
  DailyForecastItem,
  HourlyForecastItem,
  PressureUnit,
  TemperatureUnit,
  WeatherCoordinates,
  WeatherData,
  WeatherMetrics,
  WindSpeedUnit,
} from './types';

// Быстрый кэш координат популярных городов
export const POPULAR_CITIES: Record<string, WeatherCoordinates> = {
  москва: { lat: 55.7558, lon: 37.6173, name: 'Москва', country: 'Россия' },
  moscow: { lat: 55.7558, lon: 37.6173, name: 'Москва', country: 'Россия' },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351, name: 'Санкт-Петербург', country: 'Россия' },
  spb: { lat: 59.9343, lon: 30.3351, name: 'Санкт-Петербург', country: 'Россия' },
  лондон: { lat: 51.5074, lon: -0.1278, name: 'Лондон', country: 'Великобритания' },
  london: { lat: 51.5074, lon: -0.1278, name: 'London', country: 'United Kingdom' },
  'нью-йорк': { lat: 40.7128, lon: -74.006, name: 'Нью-Йорк', country: 'США' },
  'new york': { lat: 40.7128, lon: -74.006, name: 'New York', country: 'United States' },
  токио: { lat: 35.6762, lon: 139.6503, name: 'Токио', country: 'Япония' },
  tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo', country: 'Japan' },
  берлин: { lat: 52.52, lon: 13.405, name: 'Берлин', country: 'Германия' },
  париж: { lat: 48.8566, lon: 2.3522, name: 'Париж', country: 'Франция' },
  дубай: { lat: 25.2048, lon: 55.2708, name: 'Дубай', country: 'ОАЭ' },
  ереван: { lat: 40.1872, lon: 44.5152, name: 'Ереван', country: 'Армения' },
  тбилиси: { lat: 41.7151, lon: 44.8271, name: 'Тбилиси', country: 'Грузия' },
  алматы: { lat: 43.222, lon: 76.8512, name: 'Алматы', country: 'Казахстан' },
  астана: { lat: 51.1694, lon: 71.4491, name: 'Астана', country: 'Казахстан' },
  минск: { lat: 53.9045, lon: 27.5615, name: 'Минск', country: 'Беларусь' },
};

/**
 * Живой поиск городов по API Open-Meteo Geocoding
 */
export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=8&language=ru&format=json`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((r: any) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch (err) {
    console.warn('[WeatherService] Geocoding search failed:', err);
    return [];
  }
}

/**
 * Обратное геокодирование: получение названия города по координатам
 */
export async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; country?: string }> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ru`,
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      if (city) {
        return {
          name: city,
          country: data.countryName,
        };
      }
    }
  } catch {
    // Фолбэк на OpenStreetMap Nominatim
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ru`,
      { headers: { 'User-Agent': 'DashFlow-Weather/3.0' } },
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.state || data.name;
      if (city) {
        return {
          name: city,
          country: data.address?.country,
        };
      }
    }
  } catch {
    // Игнорируем
  }

  return { name: 'Моё местоположение' };
}

/**
 * Запрос геолокации браузера пользователя
 */
export async function detectUserLocation(): Promise<WeatherCoordinates> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Геолокация не поддерживается вашим браузером');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const geoInfo = await reverseGeocode(lat, lon);
          resolve({
            lat,
            lon,
            name: geoInfo.name,
            country: geoInfo.country,
          });
        } catch {
          resolve({ lat, lon, name: 'Моё местоположение' });
        }
      },
      (err) => {
        let msg = 'Не удалось получить геолокацию';
        if (err.code === 1) msg = 'Доступ к геолокации запрещен пользователем';
        if (err.code === 2) msg = 'Местоположение недоступно';
        if (err.code === 3) msg = 'Превышено время ожидания геолокации';
        reject(new Error(msg));
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 600000 },
    );
  });
}

/**
 * Загрузка подробного прогноза погоды с Open-Meteo
 */
export async function fetchFullWeatherData(params: {
  city?: string;
  coords?: WeatherCoordinates;
  autoLocation?: boolean;
}): Promise<WeatherData> {
  let activeCoords: WeatherCoordinates | null = null;
  let isAuto = Boolean(params.autoLocation);

  // 1. Координаты из параметров
  if (params.coords && params.coords.lat && params.coords.lon) {
    activeCoords = params.coords;
  }

  // 2. Если включено авто-гео и нет координат
  if (!activeCoords && params.autoLocation) {
    try {
      activeCoords = await detectUserLocation();
      isAuto = true;
    } catch {
      // Фолбэк на город
    }
  }

  // 3. Поиск по имени города
  if (!activeCoords) {
    const rawCity = params.city || 'Москва';
    const norm = rawCity.trim().toLowerCase();
    if (POPULAR_CITIES[norm]) {
      activeCoords = POPULAR_CITIES[norm];
    } else {
      const results = await searchCities(rawCity);
      if (results.length > 0) {
        activeCoords = {
          lat: results[0].latitude,
          lon: results[0].longitude,
          name: results[0].name,
          country: results[0].country,
        };
      } else {
        activeCoords = POPULAR_CITIES['москва'];
      }
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${activeCoords.lat}&longitude=${activeCoords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,visibility,wind_speed_10m,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP Error ${res.status}`);
    }

    const json = await res.json();
    const current = json.current || json.current_weather || {};
    const daily = json.daily || {};
    const hourly = json.hourly || {};

    const currentTemp = Math.round(current.temperature_2m ?? current.temperature ?? 20);
    const code = current.weather_code ?? current.weathercode ?? 0;
    const feels = current.apparent_temperature !== undefined ? Math.round(current.apparent_temperature) : currentTemp;
    const humidity = current.relative_humidity_2m ? Math.round(current.relative_humidity_2m) : 60;
    const windSpeed = current.wind_speed_10m !== undefined ? Math.round(current.wind_speed_10m * 10) / 10 : 3;
    const windDirection = current.wind_direction_10m;
    const windGusts = current.wind_gusts_10m;
    const pressure = current.surface_pressure ? Math.round(current.surface_pressure) : 1013;
    const isDay = current.is_day === 1 || current.is_day === undefined;

    // Сбор почасового прогноза (начиная с текущего часа, 24 точки)
    const hourlyList: HourlyForecastItem[] = [];
    if (hourly.time && hourly.temperature_2m) {
      const now = new Date();
      let startIdx = 0;

      // Ищем ближайший час
      const currentTimeStr = now.toISOString().slice(0, 13);
      for (let i = 0; i < hourly.time.length; i++) {
        if (hourly.time[i].startsWith(currentTimeStr)) {
          startIdx = i;
          break;
        }
      }

      for (let i = 0; i < 24 && startIdx + i < hourly.time.length; i++) {
        const idx = startIdx + i;
        const rawTime = hourly.time[idx];
        const dateObj = new Date(rawTime);
        const timeFormatted = dateObj.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });

        hourlyList.push({
          time: i === 0 ? 'Сейчас' : timeFormatted,
          fullTime: rawTime,
          temp: Math.round(hourly.temperature_2m[idx] ?? currentTemp),
          code: hourly.weather_code?.[idx] ?? code,
          precipitationProbability: hourly.precipitation_probability?.[idx] ?? 0,
          isDay: hourly.is_day?.[idx] === 1,
          humidity: hourly.relative_humidity_2m?.[idx],
          windSpeed: hourly.wind_speed_10m?.[idx],
        });
      }
    }

    // Сбор 7-дневного прогноза
    const dailyList: DailyForecastItem[] = [];
    if (daily.time && daily.temperature_2m_max) {
      for (let i = 0; i < daily.time.length && i < 7; i++) {
        const dateStr = daily.time[i];
        dailyList.push({
          date: dateStr,
          dayName: getDayName(dateStr, i),
          minTemp: Math.round(daily.temperature_2m_min?.[i] ?? currentTemp - 3),
          maxTemp: Math.round(daily.temperature_2m_max?.[i] ?? currentTemp + 3),
          code: daily.weather_code?.[i] ?? code,
          precipitationProbability: daily.precipitation_probability_max?.[i] ?? 0,
          sunrise: daily.sunrise?.[i] ? formatSunTime(daily.sunrise[i]) : undefined,
          sunset: daily.sunset?.[i] ? formatSunTime(daily.sunset[i]) : undefined,
          uvIndexMax: daily.uv_index_max?.[i] !== undefined ? Math.round(daily.uv_index_max[i]) : undefined,
        });
      }
    }

    const todayDaily = dailyList[0];
    const metrics: WeatherMetrics = {
      feelsLike: feels,
      humidity,
      windSpeed,
      windDirection,
      windGusts,
      pressure,
      uvIndex: todayDaily?.uvIndexMax ?? (hourly.uv_index?.[0] !== undefined ? Math.round(hourly.uv_index[0]) : 3),
      visibility: hourly.visibility?.[0] ? Math.round(hourly.visibility[0] / 1000) : 10,
      cloudCover: current.cloud_cover,
      sunrise: todayDaily?.sunrise,
      sunset: todayDaily?.sunset,
      isDay,
    };

    const maxTemp = todayDaily?.maxTemp ?? currentTemp + 2;
    const minTemp = todayDaily?.minTemp ?? currentTemp - 2;

    const result: WeatherData = {
      temperature: currentTemp,
      weathercode: code,
      city: activeCoords.name || params.city || 'Москва',
      country: activeCoords.country,
      isAutoLocation: isAuto,
      maxTemp,
      minTemp,
      feelsLike: feels,
      windSpeed,
      humidity,
      metrics,
      hourly: hourlyList,
      daily: dailyList,
      isOffline: false,
      lastUpdated: Date.now(),
    };

    try {
      await StorageAdapter.setLarge(STORAGE_KEYS.WEATHER_CACHE, result);
    } catch {
      // Игнорируем
    }

    return result;
  } catch (err) {
    try {
      const cached = await StorageAdapter.getLarge<WeatherData>(STORAGE_KEYS.WEATHER_CACHE);
      if (cached) {
        return { ...cached, isOffline: true };
      }
    } catch {
      // Игнорируем
    }
    throw err;
  }
}

// Вспомогательные форматировщики

export function formatTemperature(celsius: number, unit: TemperatureUnit = 'celsius'): string {
  if (unit === 'fahrenheit') {
    const f = Math.round(celsius * 1.8 + 32);
    return `${f > 0 ? '+' : ''}${f}°`;
  }
  return `${celsius > 0 ? '+' : ''}${celsius}°`;
}

export function formatWindSpeed(speedMs: number, unit: WindSpeedUnit = 'ms'): string {
  if (unit === 'kmh') {
    return `${Math.round(speedMs * 3.6)} км/ч`;
  }
  if (unit === 'mph') {
    return `${Math.round(speedMs * 2.237)} миль/ч`;
  }
  return `${speedMs} м/с`;
}

export function formatPressure(hPa: number, unit: PressureUnit = 'mmhg'): string {
  if (unit === 'mmhg') {
    // 1 гПа ≈ 0.750062 мм рт. ст.
    return `${Math.round(hPa * 0.750062)} мм рт. ст.`;
  }
  return `${hPa} гПа`;
}

export function formatSunTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString.slice(-5);
  }
}

export function getDayName(dateStr: string, index: number): string {
  if (index === 0) return 'Сегодня';
  if (index === 1) return 'Завтра';
  try {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    return day.charAt(0).toUpperCase() + day.slice(1);
  } catch {
    return dateStr;
  }
}

export function getWeatherDescription(code?: number, isDay = true): string {
  if (code === undefined) return 'Облачно';
  switch (code) {
    case 0:
      return isDay ? 'Ясно' : 'Ясная ночь';
    case 1:
      return 'Преимущественно ясно';
    case 2:
      return 'Переменная облачность';
    case 3:
      return 'Пасмурно';
    case 45:
    case 48:
      return 'Туман';
    case 51:
    case 53:
    case 55:
      return 'Небольшая морось';
    case 56:
    case 57:
      return 'Ледяная морось';
    case 61:
      return 'Небольшой дождь';
    case 63:
      return 'Умеренный дождь';
    case 65:
      return 'Сильный ливень';
    case 66:
    case 67:
      return 'Ледяной дождь';
    case 71:
      return 'Небольшой снег';
    case 73:
      return 'Снегопад';
    case 75:
      return 'Сильный снегопад';
    case 77:
      return 'Снежные зерна';
    case 80:
    case 81:
    case 82:
      return 'Кратковременные дожди';
    case 85:
    case 86:
      return 'Снегопад с дождем';
    case 95:
      return 'Гроза';
    case 96:
    case 99:
      return 'Гроза с градом';
    default:
      return 'Облачно';
  }
}

export function getUvIndexInfo(uv = 0): { label: string; badgeClass: string; color: string } {
  if (uv <= 2) return { label: 'Низкий', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', color: '#10b981' };
  if (uv <= 5) return { label: 'Умеренный', badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30', color: '#f59e0b' };
  if (uv <= 7) return { label: 'Высокий', badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30', color: '#f97316' };
  if (uv <= 10) return { label: 'Очень высокий', badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30', color: '#f43f5e' };
  return { label: 'Экстремальный', badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30', color: '#a855f7' };
}

export function getWindDirectionText(deg?: number): string {
  if (deg === undefined) return '—';
  const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}
