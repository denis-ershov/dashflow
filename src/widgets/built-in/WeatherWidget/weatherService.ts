import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  numberAt,
  resilientFetch,
  stringAt,
} from '@/core/network';
import { t, useI18nStore, type SupportedLanguage, type TranslationKey } from '@/core/i18n';
import { DEFAULT_CITY, POPULAR_CITIES } from './cities';

export { DEFAULT_CITY, POPULAR_CITIES };
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



/**
 * Живой поиск городов по API Open-Meteo Geocoding
 */
/** Язык ответов геокодинга следует языку интерфейса, если вызывающий не передал свой */
const currentLanguage = (): SupportedLanguage => useI18nStore.getState().language;

export async function searchCities(
  query: string,
  lang: SupportedLanguage = currentLanguage(),
): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const res = await resilientFetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=8&language=${lang}&format=json`,
      { timeoutMs: 5000, retries: 1, circuitBreakerName: 'geocoding', silent: true },
    );
    if (!res.ok) return [];
    const data = asRecord(await res.json());

    // Город без координат или названия бесполезен — такие записи отбрасываются
    return asArray(data.results).flatMap((item): CitySearchResult[] => {
      const r = asRecord(item);
      const id = asNumber(r.id);
      const name = asString(r.name);
      const latitude = asNumber(r.latitude);
      const longitude = asNumber(r.longitude);
      if (id === undefined || !name || latitude === undefined || longitude === undefined) {
        return [];
      }
      return [{ id, name, country: asString(r.country), admin1: asString(r.admin1), latitude, longitude }];
    });
  } catch (err) {
    console.warn('[WeatherService] Geocoding search failed:', err);
    return [];
  }
}

/**
 * Обратное геокодирование: получение названия города по координатам
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  lang: SupportedLanguage = currentLanguage(),
): Promise<{ name: string; country?: string }> {
  try {
    const res = await resilientFetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`,
      { timeoutMs: 5000, retries: 1, circuitBreakerName: 'geocoding', silent: true },
    );
    if (res.ok) {
      const data = asRecord(await res.json());
      const city = asString(data.city) ?? asString(data.locality) ?? asString(data.principalSubdivision);
      if (city) {
        return { name: city, country: asString(data.countryName) };
      }
    }
  } catch {
    // Фолбэк на OpenStreetMap Nominatim
  }

  try {
    const res = await resilientFetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=${lang}`,
      {
        headers: { 'User-Agent': 'DashFlow-Weather/3.0' },
        timeoutMs: 5000,
        retries: 1,
        circuitBreakerName: 'geocoding',
        silent: true,
      },
    );
    if (res.ok) {
      const data = asRecord(await res.json());
      const address = asRecord(data.address);
      const city =
        asString(address.city) ?? asString(address.town) ?? asString(address.state) ?? asString(data.name);
      if (city) {
        return { name: city, country: asString(address.country) };
      }
    }
  } catch {
    // Игнорируем
  }

  return { name: t('weather.myLocation') };
}

/**
 * Запрос геолокации браузера пользователя
 */
export async function detectUserLocation(
  lang: SupportedLanguage = currentLanguage(),
): Promise<WeatherCoordinates> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error(t('weather.geo.unsupported', undefined, lang));
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        const reasons: Record<number, TranslationKey> = {
          1: 'weather.geo.denied',
          2: 'weather.geo.unavailable',
          3: 'weather.geo.timeout',
        };
        reject(new Error(t(reasons[err.code] ?? 'weather.geo.failed', undefined, lang)));
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 600000 },
    );
  });

  const { latitude: lat, longitude: lon } = position.coords;
  try {
    const geoInfo = await reverseGeocode(lat, lon, lang);
    return { lat, lon, name: geoInfo.name, country: geoInfo.country };
  } catch {
    return { lat, lon, name: t('weather.myLocation', undefined, lang) };
  }
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
    const rawCity = params.city || DEFAULT_CITY;
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
        activeCoords = POPULAR_CITIES[DEFAULT_CITY.toLowerCase()];
      }
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${activeCoords.lat}&longitude=${activeCoords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,visibility,wind_speed_10m,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const res = await resilientFetch(url, {
      timeoutMs: isTestEnv ? 1000 : 4500,
      retries: isTestEnv ? 0 : 1,
      baseDelayMs: isTestEnv ? 0 : 500,
      circuitBreakerName: 'open-meteo',
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP Error ${res.status}`);
    }

    const json = asRecord(await res.json());
    const current = asRecord(json.current ?? json.current_weather);
    const daily = asRecord(json.daily);
    const hourly = asRecord(json.hourly);
    const lang = currentLanguage();

    const currentTemp = Math.round(asNumber(current.temperature_2m) ?? asNumber(current.temperature) ?? 20);
    const code = asNumber(current.weather_code) ?? asNumber(current.weathercode) ?? 0;
    const apparent = asNumber(current.apparent_temperature);
    const feels = apparent !== undefined ? Math.round(apparent) : currentTemp;
    const rawHumidity = asNumber(current.relative_humidity_2m);
    const humidity = rawHumidity !== undefined ? Math.round(rawHumidity) : 60;
    const rawWind = asNumber(current.wind_speed_10m);
    const windSpeed = rawWind !== undefined ? Math.round(rawWind * 10) / 10 : 3;
    const windDirection = asNumber(current.wind_direction_10m);
    const windGusts = asNumber(current.wind_gusts_10m);
    const rawPressure = asNumber(current.surface_pressure);
    const pressure = rawPressure !== undefined ? Math.round(rawPressure) : 1013;
    const isDay = current.is_day === 1 || current.is_day === undefined;

    // Сбор почасового прогноза (начиная с текущего часа, 24 точки)
    const hourlyList: HourlyForecastItem[] = [];
    const hourlyTimes = asArray(hourly.time);
    if (hourlyTimes.length > 0 && Array.isArray(hourly.temperature_2m)) {
      // Ищем ближайший к текущему моменту час
      const nowMs = Date.now();
      let startIdx = 0;
      let minDiff = Infinity;
      hourlyTimes.forEach((value, i) => {
        const time = asString(value);
        if (!time) return;
        const diff = Math.abs(new Date(time).getTime() - nowMs);
        if (diff < minDiff) {
          minDiff = diff;
          startIdx = i;
        }
      });

      for (let i = 0; i < 24 && startIdx + i < hourlyTimes.length; i++) {
        const idx = startIdx + i;
        const rawTime = stringAt(hourlyTimes, idx);
        if (!rawTime) continue;
        hourlyList.push({
          time: new Date(rawTime).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
          fullTime: rawTime,
          temp: Math.round(numberAt(hourly.temperature_2m, idx) ?? currentTemp),
          code: numberAt(hourly.weather_code, idx) ?? code,
          precipitationProbability: numberAt(hourly.precipitation_probability, idx) ?? 0,
          isDay: numberAt(hourly.is_day, idx) === 1,
          humidity: numberAt(hourly.relative_humidity_2m, idx),
          windSpeed: numberAt(hourly.wind_speed_10m, idx),
        });
      }
    }

    // Сбор 7-дневного прогноза
    const dailyList: DailyForecastItem[] = [];
    const dailyDates = asArray(daily.time);
    if (dailyDates.length > 0 && Array.isArray(daily.temperature_2m_max)) {
      for (let i = 0; i < dailyDates.length && i < 7; i++) {
        const dateStr = stringAt(dailyDates, i);
        if (!dateStr) continue;
        const sunrise = stringAt(daily.sunrise, i);
        const sunset = stringAt(daily.sunset, i);
        const uvMax = numberAt(daily.uv_index_max, i);
        dailyList.push({
          date: dateStr,
          minTemp: Math.round(numberAt(daily.temperature_2m_min, i) ?? currentTemp - 3),
          maxTemp: Math.round(numberAt(daily.temperature_2m_max, i) ?? currentTemp + 3),
          code: numberAt(daily.weather_code, i) ?? code,
          precipitationProbability: numberAt(daily.precipitation_probability_max, i) ?? 0,
          sunrise: sunrise ? formatSunTime(sunrise, lang) : undefined,
          sunset: sunset ? formatSunTime(sunset, lang) : undefined,
          uvIndexMax: uvMax !== undefined ? Math.round(uvMax) : undefined,
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
      uvIndex: todayDaily?.uvIndexMax ?? Math.round(numberAt(hourly.uv_index, 0) ?? 3),
      visibility: Math.round((numberAt(hourly.visibility, 0) ?? 10_000) / 1000),
      cloudCover: asNumber(current.cloud_cover),
      sunrise: todayDaily?.sunrise,
      sunset: todayDaily?.sunset,
      isDay,
    };

    const maxTemp = todayDaily?.maxTemp ?? currentTemp + 2;
    const minTemp = todayDaily?.minTemp ?? currentTemp - 2;

    const result: WeatherData = {
      temperature: currentTemp,
      weathercode: code,
      city: activeCoords.name || params.city || DEFAULT_CITY,
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
    const cached = await getCachedWeatherData();
    if (cached) {
      return { ...cached, isOffline: true };
    }
    throw err;
  }
}

/**
 * Получение кешированных данных погоды из локального хранилища
 */
export async function getCachedWeatherData(): Promise<WeatherData | null> {
  try {
    return await StorageAdapter.getLarge<WeatherData>(STORAGE_KEYS.WEATHER_CACHE);
  } catch {
    return null;
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

export function formatWindSpeed(
  speedMs: number,
  unit: WindSpeedUnit = 'ms',
  lang: SupportedLanguage = 'ru',
): string {
  if (unit === 'kmh') return t('weather.units.kmh', { value: Math.round(speedMs * 3.6) }, lang);
  if (unit === 'mph') return t('weather.units.mph', { value: Math.round(speedMs * 2.237) }, lang);
  return t('weather.units.ms', { value: speedMs }, lang);
}

export function formatPressure(
  hPa: number,
  unit: PressureUnit = 'mmhg',
  lang: SupportedLanguage = 'ru',
): string {
  // 1 гПа ≈ 0.750062 мм рт. ст.
  if (unit === 'mmhg') return t('weather.units.mmhg', { value: Math.round(hPa * 0.750062) }, lang);
  return t('weather.units.hpa', { value: hPa }, lang);
}

export function formatSunTime(isoString: string, lang: SupportedLanguage = 'ru'): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString.slice(-5);
  }
}

export function getDayName(dateStr: string, index: number, lang: SupportedLanguage = 'ru'): string {
  if (index === 0) return t('weather.today', undefined, lang);
  if (index === 1) return t('weather.tomorrow', undefined, lang);
  try {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
    return day.charAt(0).toUpperCase() + day.slice(1);
  } catch {
    return dateStr;
  }
}

/** Ключ описания погоды по коду WMO */
function weatherCodeKey(code: number | undefined, isDay: boolean): TranslationKey {
  if (code === undefined) return 'weather.codes.cloudy';
  if (code === 0) return isDay ? 'weather.codes.clear' : 'weather.codes.clearNight';
  const table: Record<number, TranslationKey> = {
    1: 'weather.codes.mainlyClear',
    2: 'weather.codes.partlyCloudy',
    3: 'weather.codes.overcast',
    45: 'weather.codes.fog',
    48: 'weather.codes.fog',
    51: 'weather.codes.drizzle',
    53: 'weather.codes.drizzle',
    55: 'weather.codes.drizzle',
    56: 'weather.codes.freezingDrizzle',
    57: 'weather.codes.freezingDrizzle',
    61: 'weather.codes.lightRain',
    63: 'weather.codes.moderateRain',
    65: 'weather.codes.heavyRain',
    66: 'weather.codes.freezingRain',
    67: 'weather.codes.freezingRain',
    71: 'weather.codes.lightSnow',
    73: 'weather.codes.snow',
    75: 'weather.codes.heavySnow',
    77: 'weather.codes.snowGrains',
    80: 'weather.codes.showers',
    81: 'weather.codes.showers',
    82: 'weather.codes.showers',
    85: 'weather.codes.sleet',
    86: 'weather.codes.sleet',
    95: 'weather.codes.thunderstorm',
    96: 'weather.codes.thunderstormHail',
    99: 'weather.codes.thunderstormHail',
  };
  return table[code] ?? 'weather.codes.cloudy';
}

export function getWeatherDescription(code?: number, isDay = true, lang: SupportedLanguage = 'ru'): string {
  return t(weatherCodeKey(code, isDay), undefined, lang);
}

export function getUvIndexInfo(
  uv = 0,
  lang: SupportedLanguage = 'ru',
): { label: string; badgeClass: string; color: string } {
  const label = (level: 'low' | 'moderate' | 'high' | 'veryHigh' | 'extreme') =>
    t(`weather.uvLevels.${level}`, undefined, lang);
  if (uv <= 2) return { label: label('low'), badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', color: '#10b981' };
  if (uv <= 5) return { label: label('moderate'), badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30', color: '#f59e0b' };
  if (uv <= 7) return { label: label('high'), badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30', color: '#f97316' };
  if (uv <= 10) return { label: label('veryHigh'), badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30', color: '#f43f5e' };
  return { label: label('extreme'), badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30', color: '#a855f7' };
}

const COMPASS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;

export function getWindDirectionText(deg?: number, lang: SupportedLanguage = 'ru'): string {
  if (deg === undefined) return '—';
  return t(`weather.compass.${COMPASS[Math.round(deg / 45) % 8]}`, undefined, lang);
}
