import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WeatherWidget } from '@/widgets/built-in/WeatherWidget/WeatherWidget';
import { weatherManifest } from '@/widgets/built-in/WeatherWidget/manifest';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';

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

  it('манифест должен быть строго типизирован и содержать surface=panel', () => {
    expect(weatherManifest.id).toBe('weather');
    expect(weatherManifest.surface).toBe('panel');
    expect(weatherManifest.nameKey).toBe('widgets.weather');
    expect(weatherManifest.permissions).toContain('network');
  });

  it('должен загружать и отображать температуру и город при успешном ответе API', async () => {
    const mockApiResponse = {
      current_weather: { temperature: 21.4, weathercode: 1 },
      daily: { temperature_2m_max: [24.1], temperature_2m_min: [15.2] },
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
      expect(screen.getByText('+21°C')).toBeInTheDocument();
    });

    expect(screen.getByText(/Москва/i)).toBeInTheDocument();
  });

  it('при сбое сети должен отображать кешированные данные из IndexedDB с пометкой Офлайн', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));
    vi.spyOn(StorageAdapter, 'getLarge').mockResolvedValue({
      temperature: 18,
      weathercode: 0,
      city: 'Москва',
      maxTemp: 20,
      minTemp: 12,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WeatherWidget instanceId="weather-1" settings={{ city: 'Москва' }} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('+18°C')).toBeInTheDocument();
    });

    expect(screen.getByText(/Офлайн/i)).toBeInTheDocument();
  });
});
