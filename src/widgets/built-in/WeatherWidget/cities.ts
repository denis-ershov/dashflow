import type { SupportedLanguage } from '@/core/i18n';
import type { WeatherCoordinates } from './types';

/**
 * Данные, а не интерфейс: город по умолчанию и быстрый справочник популярных городов.
 * Справочник отвечает без запроса к геокодеру и даёт название на языке интерфейса;
 * названия остальных городов приходят из геокодера Open-Meteo на том же языке.
 */

/** Значение настройки «Город» по умолчанию (хранится как данные, на экран выводится локализованное имя) */
export const DEFAULT_CITY = 'Москва';

interface KnownCity {
  lat: number;
  lon: number;
  name: Record<SupportedLanguage, string>;
  country: Record<SupportedLanguage, string>;
  /** Дополнительные варианты ввода, кроме названий на всех языках */
  aliases?: readonly string[];
}

const KNOWN_CITIES: readonly KnownCity[] = [
  {
    lat: 55.7558,
    lon: 37.6173,
    name: { ru: 'Москва', en: 'Moscow' },
    country: { ru: 'Россия', en: 'Russia' },
  },
  {
    lat: 59.9343,
    lon: 30.3351,
    name: { ru: 'Санкт-Петербург', en: 'Saint Petersburg' },
    country: { ru: 'Россия', en: 'Russia' },
    aliases: ['spb', 'спб', 'st petersburg'],
  },
  {
    lat: 51.5074,
    lon: -0.1278,
    name: { ru: 'Лондон', en: 'London' },
    country: { ru: 'Великобритания', en: 'United Kingdom' },
  },
  {
    lat: 40.7128,
    lon: -74.006,
    name: { ru: 'Нью-Йорк', en: 'New York' },
    country: { ru: 'США', en: 'United States' },
    aliases: ['nyc'],
  },
  {
    lat: 35.6762,
    lon: 139.6503,
    name: { ru: 'Токио', en: 'Tokyo' },
    country: { ru: 'Япония', en: 'Japan' },
  },
  {
    lat: 52.52,
    lon: 13.405,
    name: { ru: 'Берлин', en: 'Berlin' },
    country: { ru: 'Германия', en: 'Germany' },
  },
  {
    lat: 48.8566,
    lon: 2.3522,
    name: { ru: 'Париж', en: 'Paris' },
    country: { ru: 'Франция', en: 'France' },
  },
  {
    lat: 25.2048,
    lon: 55.2708,
    name: { ru: 'Дубай', en: 'Dubai' },
    country: { ru: 'ОАЭ', en: 'United Arab Emirates' },
  },
  {
    lat: 40.1872,
    lon: 44.5152,
    name: { ru: 'Ереван', en: 'Yerevan' },
    country: { ru: 'Армения', en: 'Armenia' },
  },
  {
    lat: 41.7151,
    lon: 44.8271,
    name: { ru: 'Тбилиси', en: 'Tbilisi' },
    country: { ru: 'Грузия', en: 'Georgia' },
  },
  {
    lat: 43.222,
    lon: 76.8512,
    name: { ru: 'Алматы', en: 'Almaty' },
    country: { ru: 'Казахстан', en: 'Kazakhstan' },
  },
  {
    lat: 51.1694,
    lon: 71.4491,
    name: { ru: 'Астана', en: 'Astana' },
    country: { ru: 'Казахстан', en: 'Kazakhstan' },
  },
  {
    lat: 53.9045,
    lon: 27.5615,
    name: { ru: 'Минск', en: 'Minsk' },
    country: { ru: 'Беларусь', en: 'Belarus' },
  },
];

const normalize = (value: string) => value.trim().toLowerCase();

const toCoordinates = (city: KnownCity, lang: SupportedLanguage): WeatherCoordinates => ({
  lat: city.lat,
  lon: city.lon,
  name: city.name[lang],
  country: city.country[lang],
});

/** Город из справочника по любому из названий или псевдонимов; имя и страна — на языке lang */
export function findKnownCity(
  query: string,
  lang: SupportedLanguage,
): WeatherCoordinates | undefined {
  const needle = normalize(query);
  const city = KNOWN_CITIES.find(
    (c) =>
      Object.values(c.name).some((name) => normalize(name) === needle) ||
      c.aliases?.includes(needle),
  );
  return city ? toCoordinates(city, lang) : undefined;
}

/** Координаты города по умолчанию — запасной вариант, когда город не найден */
export function defaultCityCoordinates(lang: SupportedLanguage): WeatherCoordinates {
  const city = KNOWN_CITIES[0];
  if (!city) throw new Error('Справочник городов пуст');
  return toCoordinates(city, lang);
}
