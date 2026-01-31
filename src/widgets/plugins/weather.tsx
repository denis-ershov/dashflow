import { useState, useEffect, useCallback } from 'react';
import { registerWidget } from '../registry';
import { getWeatherByCity, getWeatherByCoords, type WeatherData } from '@/lib/weather-api';
import type { WidgetDefinition, WidgetComponentProps, WidgetSettingsProps } from '../types';

// =============================================================================
// CONFIG
// =============================================================================

interface WeatherConfig {
  city?: string;
  useLocation?: boolean;
  tempUnit?: 'celsius' | 'fahrenheit';
}

// =============================================================================
// UI COMPONENT
// =============================================================================

function WeatherComponent({
  instanceId,
  config,
}: WidgetComponentProps<WeatherConfig>) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const city = config.city?.trim();
  const useLocation = config.useLocation ?? false;
  const tempUnit = config.tempUnit ?? 'celsius';

  const formatTemp = useCallback(
    (c: number) => (tempUnit === 'fahrenheit' ? (c * 9) / 5 + 32 : c),
    [tempUnit]
  );
  const tempSuffix = tempUnit === 'fahrenheit' ? '°F' : '°C';

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (city) {
        const result = await getWeatherByCity(city, instanceId);
        setData(result);
      } else if (useLocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 5 * 60 * 1000,
          });
        });
        const result = await getWeatherByCoords(
          pos.coords.latitude,
          pos.coords.longitude,
          instanceId
        );
        setData(result);
      } else {
        setError('Set a city or enable location');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load weather';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [city, useLocation, instanceId, retryCount]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
        Loading weather…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <span className="text-red-400 text-lg mb-1">⚠</span>
        <p className="text-slate-400 text-sm">{error}</p>
        <button
          type="button"
          onClick={() => setRetryCount((c) => c + 1)}
          className="mt-2 px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-full p-4 justify-center">
      <div className="text-slate-200">
        <p className="text-3xl font-light tabular-nums">
          {Math.round(formatTemp(data.temp))}
          {tempSuffix}
        </p>
        <p className="text-sm text-slate-400 mt-0.5">{data.label}</p>
        <p className="text-xs text-slate-500 mt-1 truncate">{data.city}</p>
        <p className="text-xs text-slate-600 mt-0.5">{data.humidity}% humidity</p>
      </div>
      <button
        type="button"
        onClick={() => fetchWeather()}
        className="mt-3 text-xs text-slate-500 hover:text-slate-400 self-start"
      >
        Refresh
      </button>
    </div>
  );
}

// =============================================================================
// SETTINGS PANEL
// =============================================================================

function WeatherSettingsPanel({
  instanceId,
  config,
  onConfigChange,
}: WidgetSettingsProps<WeatherConfig>) {
  return (
    <div className="space-y-3 p-3 text-sm">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.useLocation ?? false}
          onChange={(e) => onConfigChange({ useLocation: e.target.checked })}
          className="rounded border-slate-600 bg-slate-800 text-slate-400"
        />
        Use my location
      </label>
      <div>
        <label
          htmlFor={`weather-city-${instanceId}`}
          className="block text-slate-400 text-xs mb-1"
        >
          City (overrides location)
        </label>
        <input
          id={`weather-city-${instanceId}`}
          type="text"
          value={config.city ?? ''}
          onChange={(e) => onConfigChange({ city: e.target.value || undefined })}
          placeholder="e.g. London"
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800/50 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
        />
      </div>
      <div>
        <span className="block text-slate-400 text-xs mb-1">Temperature unit</span>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`weather-unit-${instanceId}`}
              checked={(config.tempUnit ?? 'celsius') === 'celsius'}
              onChange={() => onConfigChange({ tempUnit: 'celsius' })}
              className="text-slate-400"
            />
            Celsius
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`weather-unit-${instanceId}`}
              checked={(config.tempUnit ?? 'celsius') === 'fahrenheit'}
              onChange={() => onConfigChange({ tempUnit: 'fahrenheit' })}
              className="text-slate-400"
            />
            Fahrenheit
          </label>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// REGISTRATION
// =============================================================================

const weatherDefinition: WidgetDefinition<WeatherConfig> = {
  metadata: {
    type: 'weather',
    name: 'Weather',
    description: 'Location-based weather with manual city override',
  },
  component: WeatherComponent,
  defaultSize: { w: 3, h: 2, minW: 2, minH: 2 },
  SettingsPanel: WeatherSettingsPanel,
  defaultConfig: {
    city: '',
    useLocation: true,
    tempUnit: 'celsius',
  },
};

registerWidget(weatherDefinition);
