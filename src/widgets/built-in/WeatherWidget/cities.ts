import type { WeatherCoordinates } from './types';

/**
 * Данные, а не интерфейс: город по умолчанию и быстрый справочник координат популярных городов.
 * Ключи — то, что пользователь вводит (в том числе по-русски); отображаемое имя для остальных городов
 * приходит из геокодера Open-Meteo.
 */
export const DEFAULT_CITY = 'Москва';

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
