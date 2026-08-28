export type WeatherViewMode = 'dashboard' | 'compact' | 'hourly' | 'weekly';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'ms' | 'kmh' | 'mph';
export type PressureUnit = 'mmhg' | 'hpa';

export interface WeatherCoordinates {
  lat: number;
  lon: number;
  name?: string;
  country?: string;
}

export interface WeatherSettings {
  city?: string;
  autoLocation?: boolean;
  coords?: WeatherCoordinates;
  viewMode?: WeatherViewMode;
  tempUnit?: TemperatureUnit;
  windSpeedUnit?: WindSpeedUnit;
  pressureUnit?: PressureUnit;
  showHourly?: boolean;
  showDaily?: boolean;
  showMetrics?: boolean;
  showFeelsLike?: boolean;
  showUv?: boolean;
  showSunTimes?: boolean;
  showHumidity?: boolean;
  showWind?: boolean;
}

export interface HourlyForecastItem {
  time: string; // "14:00"
  fullTime: string; // ISO date
  temp: number;
  code: number;
  precipitationProbability?: number; // 0-100%
  isDay?: boolean;
  humidity?: number;
  windSpeed?: number;
}

export interface DailyForecastItem {
  date: string; // "2026-08-28"
  dayName: string; // "Сегодня", "Завтра", "Сб", "Вс"
  minTemp: number;
  maxTemp: number;
  code: number;
  precipitationProbability?: number; // 0-100%
  sunrise?: string;
  sunset?: string;
  uvIndexMax?: number;
}

export interface WeatherMetrics {
  feelsLike?: number;
  humidity?: number;
  windSpeed?: number; // в м/с
  windDirection?: number;
  windGusts?: number;
  pressure?: number; // в hPa
  uvIndex?: number;
  visibility?: number; // в км
  cloudCover?: number; // %
  sunrise?: string;
  sunset?: string;
  isDay?: boolean;
}

export interface WeatherData {
  temperature: number;
  weathercode: number;
  city: string;
  country?: string;
  isAutoLocation?: boolean;
  maxTemp: number;
  minTemp: number;
  feelsLike?: number;
  windSpeed?: number;
  humidity?: number;
  metrics: WeatherMetrics;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  isOffline?: boolean;
  lastUpdated: number;
}

export interface CitySearchResult {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}
