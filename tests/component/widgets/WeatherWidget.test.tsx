import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WeatherWidget } from '@/widgets/built-in/WeatherWidget/WeatherWidget';
import { weatherManifest } from '@/widgets/built-in/WeatherWidget/manifest';
import { StorageAdapter } from '@/core/storage/StorageAdapter';

describe('WeatherWidget Component & Manifest', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.restoreAllMocks();
  });

  it('манифест должен быть строго типизирован и содержать surface=panel и permissions', () => {
    expect(weatherManifest.id).toBe('weather');
    expect(weatherManifest.surface).toBe('panel');
    expect(weatherManifest.nameKey).toBe('widgets.weather');
    expect(weatherManifest.permissions).toContain('network');
    expect(weatherManifest.permissions).toContain('geolocation');
    expect(weatherManifest.loadSettings).toBeDefined();
  });

  it('должен загружать и отображать температуру, город и вкладки при успешном ответе API', async () => {
    const mockApiResponse = {
      current: {
        temperature_2m: 21.4,
        weather_code: 1,
        apparent_temperature: 20.1,
        relative_humidity_2m: 52,
        wind_speed_10m: 4.1,
        surface_pressure: 1014,
        is_day: 1,
      },
      daily: {
        time: ['2026-08-28', '2026-08-29'],
        temperature_2m_max: [24.1, 25.0],
        temperature_2m_min: [15.2, 16.0],
        weather_code: [1, 2],
        precipitation_probability_max: [10, 30],
        sunrise: ['2026-08-28T05:30'],
        sunset: ['2026-08-28T19:30'],
        uv_index_max: [5],
      },
      hourly: {
        time: ['2026-08-28T18:00'],
        temperature_2m: [21.4],
        weather_code: [1],
        precipitation_probability: [10],
        is_day: [1],
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    render(
      <QueryClientProvider client={queryClient}>
        <WeatherWidget instanceId="weather-1" settings={{ city: 'Москва' }} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('+21°').length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Москва/i)).toBeInTheDocument();
    expect(screen.getByText('Обзор')).toBeInTheDocument();
    expect(screen.getByText('24ч')).toBeInTheDocument();
    expect(screen.getByText('7 дн.')).toBeInTheDocument();
    expect(screen.getByText('Детали')).toBeInTheDocument();
  });

  it('позволяет переключать вкладки прямо в виджете (например, 24ч и Детали)', async () => {
    const mockApiResponse = {
      current: {
        temperature_2m: 19.0,
        weather_code: 0,
        apparent_temperature: 18.0,
        relative_humidity_2m: 45,
        wind_speed_10m: 3.5,
        wind_direction_10m: 270,
        surface_pressure: 1015,
        is_day: 1,
      },
      daily: {
        time: ['2026-08-28'],
        temperature_2m_max: [20.0],
        temperature_2m_min: [12.0],
        weather_code: [0],
        sunrise: ['2026-08-28T05:30'],
        sunset: ['2026-08-28T19:30'],
        uv_index_max: [4],
      },
      hourly: {
        time: ['2026-08-28T18:00', '2026-08-28T19:00'],
        temperature_2m: [19.0, 18.0],
        weather_code: [0, 0],
        precipitation_probability: [0, 0],
        is_day: [1, 1],
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);

    render(
      <QueryClientProvider client={queryClient}>
        <WeatherWidget instanceId="weather-1" settings={{ city: 'Москва' }} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('+19°').length).toBeGreaterThan(0);
    });

    // Переключаемся на Детали
    fireEvent.click(screen.getByText('Детали'));
    expect(screen.getByText('Скорость ветра')).toBeInTheDocument();
    expect(screen.getByText('Влажность воздуха')).toBeInTheDocument();
  });

  it('при сбое сети должен отображать кешированные данные из IndexedDB с пометкой Офлайн', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));
    vi.spyOn(StorageAdapter, 'getLarge').mockResolvedValue({
      temperature: 18,
      weathercode: 0,
      city: 'Москва',
      maxTemp: 20,
      minTemp: 12,
      metrics: {
        feelsLike: 17,
        humidity: 60,
        windSpeed: 4,
        pressure: 1012,
        uvIndex: 3,
        isDay: true,
      },
      hourly: [],
      daily: [],
      lastUpdated: Date.now(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WeatherWidget instanceId="weather-1" settings={{ city: 'Москва' }} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('+18°').length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Офлайн/i)).toBeInTheDocument();
  });
});
