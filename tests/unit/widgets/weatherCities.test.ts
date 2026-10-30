import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CITY,
  defaultCityCoordinates,
  findKnownCity,
} from '@/widgets/built-in/WeatherWidget/cities';

describe('Справочник городов погоды', () => {
  it('находит город по названию на любом языке и отдаёт имя на языке интерфейса', () => {
    expect(findKnownCity('Москва', 'en')).toMatchObject({ name: 'Moscow', country: 'Russia' });
    expect(findKnownCity('moscow', 'ru')).toMatchObject({ name: 'Москва', country: 'Россия' });
    expect(findKnownCity('  ЛОНДОН ', 'en')?.name).toBe('London');
  });

  it('понимает псевдонимы', () => {
    expect(findKnownCity('spb', 'en')?.name).toBe('Saint Petersburg');
    expect(findKnownCity('nyc', 'ru')?.name).toBe('Нью-Йорк');
  });

  it('неизвестный город оставляет геокодеру', () => {
    expect(findKnownCity('Казань', 'ru')).toBeUndefined();
  });

  it('город по умолчанию локализуется и совпадает с настройкой по умолчанию', () => {
    expect(defaultCityCoordinates('en').name).toBe('Moscow');
    expect(findKnownCity(DEFAULT_CITY, 'ru')?.name).toBe(DEFAULT_CITY);
  });
});
