import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatTemperature,
  formatWindSpeed,
  formatPressure,
  getWeatherDescription,
  getUvIndexInfo,
  getWindDirectionText,
  getDayName,
  searchCities,
  fetchFullWeatherData,
} from '@/widgets/built-in/WeatherWidget/weatherService';
import { StorageAdapter } from '@/core/storage/StorageAdapter';

describe('weatherService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Formatting utilities', () => {
    it('formatTemperature formats celsius and fahrenheit correctly', () => {
      expect(formatTemperature(20, 'celsius')).toBe('+20°');
      expect(formatTemperature(-5, 'celsius')).toBe('-5°');
      expect(formatTemperature(0, 'celsius')).toBe('0°');
      expect(formatTemperature(20, 'fahrenheit')).toBe('+68°');
    });

    it('formatWindSpeed converts ms, kmh, and mph', () => {
      expect(formatWindSpeed(5, 'ms')).toBe('5 м/с');
      expect(formatWindSpeed(10, 'kmh')).toBe('36 км/ч');
      expect(formatWindSpeed(10, 'mph')).toBe('22 миль/ч');
    });

    it('formatPressure formats mmhg and hpa', () => {
      expect(formatPressure(1013, 'hpa')).toBe('1013 гПа');
      expect(formatPressure(1013, 'mmhg')).toBe('760 мм рт. ст.');
    });

    it('getWeatherDescription returns Russian descriptions for WMO codes', () => {
      expect(getWeatherDescription(0, true)).toBe('Ясно');
      expect(getWeatherDescription(0, false)).toBe('Ясная ночь');
      expect(getWeatherDescription(1)).toBe('Преимущественно ясно');
      expect(getWeatherDescription(61)).toBe('Небольшой дождь');
      expect(getWeatherDescription(73)).toBe('Снегопад');
      expect(getWeatherDescription(95)).toBe('Гроза');
    });

    it('getUvIndexInfo returns correct severity levels and colors', () => {
      expect(getUvIndexInfo(1).label).toBe('Низкий');
      expect(getUvIndexInfo(4).label).toBe('Умеренный');
      expect(getUvIndexInfo(6).label).toBe('Высокий');
      expect(getUvIndexInfo(9).label).toBe('Очень высокий');
      expect(getUvIndexInfo(12).label).toBe('Экстремальный');
    });

    it('getWindDirectionText translates compass degrees to cardinal points', () => {
      expect(getWindDirectionText(0)).toBe('С');
      expect(getWindDirectionText(90)).toBe('В');
      expect(getWindDirectionText(180)).toBe('Ю');
      expect(getWindDirectionText(270)).toBe('З');
      expect(getWindDirectionText(315)).toBe('СЗ');
    });

    it('getDayName returns relative names for index 0 and 1', () => {
      expect(getDayName('2026-08-28', 0)).toBe('Сегодня');
      expect(getDayName('2026-08-29', 1)).toBe('Завтра');
    });
  });

  describe('searchCities API', () => {
    it('returns empty array on short queries', async () => {
      const res = await searchCities('a');
      expect(res).toEqual([]);
    });

    it('fetches matching cities from Open-Meteo Geocoding', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                id: 1,
                name: 'Казань',
                country: 'Россия',
                admin1: 'Татарстан',
                latitude: 55.7887,
                longitude: 49.1221,
              },
            ],
          }),
      } as Response);

      const res = await searchCities('Казань');
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('Казань');
      expect(res[0].latitude).toBe(55.7887);
    });
  });

  describe('fetchFullWeatherData', () => {
    it('successfully processes full Open-Meteo payload with hourly and daily forecast', async () => {
      const mockForecast = {
        current: {
          temperature_2m: 19.5,
          weather_code: 1,
          apparent_temperature: 18.2,
          relative_humidity_2m: 55,
          wind_speed_10m: 4.2,
          wind_direction_10m: 310,
          surface_pressure: 1012,
          is_day: 1,
        },
        daily: {
          time: ['2026-08-28', '2026-08-29'],
          temperature_2m_max: [22.0, 23.5],
          temperature_2m_min: [14.0, 15.1],
          weather_code: [1, 2],
          precipitation_probability_max: [10, 20],
          sunrise: ['2026-08-28T05:30'],
          sunset: ['2026-08-28T19:30'],
          uv_index_max: [4.2, 5.1],
        },
        hourly: {
          time: ['2026-08-28T18:00', '2026-08-28T19:00'],
          temperature_2m: [19.5, 18.2],
          weather_code: [1, 1],
          precipitation_probability: [10, 10],
          is_day: [1, 0],
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockForecast),
      } as Response);

      const data = await fetchFullWeatherData({ city: 'Москва' });
      expect(data.temperature).toBe(20);
      expect(data.weathercode).toBe(1);
      expect(data.city).toBe('Москва');
      expect(data.daily).toHaveLength(2);
      expect(data.hourly.length).toBeGreaterThan(0);
      expect(data.metrics.feelsLike).toBe(18);
      expect(data.metrics.humidity).toBe(55);
      expect(data.isOffline).toBe(false);
    });

    it('falls back to cache when network fails', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
      vi.spyOn(StorageAdapter, 'getLarge').mockResolvedValue({
        temperature: 15,
        weathercode: 3,
        city: 'Санкт-Петербург',
        maxTemp: 18,
        minTemp: 10,
        metrics: {},
        hourly: [],
        daily: [],
        lastUpdated: Date.now(),
      });

      const data = await fetchFullWeatherData({ city: 'Санкт-Петербург' });
      expect(data.temperature).toBe(15);
      expect(data.city).toBe('Санкт-Петербург');
      expect(data.isOffline).toBe(true);
    });
  });
});
