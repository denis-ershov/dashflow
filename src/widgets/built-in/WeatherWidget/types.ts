export interface WeatherSettings {
  city: string;
  tempUnit?: 'celsius' | 'fahrenheit';
}

export interface WeatherData {
  temperature: number;
  weathercode: number;
  city: string;
  maxTemp: number;
  minTemp: number;
  isOffline?: boolean;
}
