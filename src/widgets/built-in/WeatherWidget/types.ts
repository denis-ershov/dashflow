export interface WeatherSettings {
  city: string;
  tempUnit?: 'celsius' | 'fahrenheit';
}

export interface HourlyForecastItem {
  time: string;
  temp: number;
  code: number;
}

export interface WeatherData {
  temperature: number;
  weathercode: number;
  city: string;
  maxTemp: number;
  minTemp: number;
  feelsLike?: number;
  windSpeed?: number;
  humidity?: number;
  hourly?: HourlyForecastItem[];
  isOffline?: boolean;
}
