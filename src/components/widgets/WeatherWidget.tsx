import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Zap, 
  MapPin, 
  Thermometer,
  Eye,
  Wind,
  Droplets,
  Gauge,
  Sunrise,
  Sunset,
  RefreshCw
} from 'lucide-react';
import { WidgetConfig, WeatherData, DailyForecast } from '../../types/widget';

interface WeatherWidgetProps {
  config: WidgetConfig;
}

// Мок данных для демонстрации
const mockWeatherData: WeatherData = {
  location: 'Москва, Россия',
  temperature: -5,
  condition: 'Облачно',
  icon: 'cloudy',
  humidity: 78,
  windSpeed: 12,
  feelsLike: -8,
  pressure: 1013,
  visibility: 10,
  uvIndex: 1,
  sunrise: '08:15',
  sunset: '16:42',
  forecast: [
    { date: '2025-01-15', maxTemp: -3, minTemp: -8, condition: 'Снег', icon: 'snow', precipitation: 80 },
    { date: '2025-01-16', maxTemp: -1, minTemp: -6, condition: 'Облачно', icon: 'cloudy', precipitation: 20 },
    { date: '2025-01-17', maxTemp: 2, minTemp: -4, condition: 'Солнечно', icon: 'sunny', precipitation: 0 },
    { date: '2025-01-18', maxTemp: -2, minTemp: -7, condition: 'Дождь', icon: 'rainy', precipitation: 90 },
    { date: '2025-01-19', maxTemp: 0, minTemp: -5, condition: 'Переменная облачность', icon: 'partly-cloudy', precipitation: 30 }
  ],
  hourlyForecast: []
};

const getWeatherIcon = (icon: string, size: number = 24) => {
  const iconProps = { size, className: "text-light-accent dark:text-dark-accent" };
  
  switch (icon) {
    case 'sunny':
      return <Sun {...iconProps} />;
    case 'cloudy':
    case 'partly-cloudy':
      return <Cloud {...iconProps} />;
    case 'rainy':
      return <CloudRain {...iconProps} />;
    case 'snow':
      return <CloudSnow {...iconProps} />;
    case 'thunderstorm':
      return <Zap {...iconProps} />;
    default:
      return <Cloud {...iconProps} />;
  }
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ config }) => {
  const { t } = useTranslation(['common', 'widgets']);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);

  useEffect(() => {
    // Имитация загрузки данных
    setTimeout(() => {
      setWeatherData(mockWeatherData);
      setLoading(false);
    }, 1000);
  }, []);

  const refreshWeather = async () => {
    setLoading(true);
    // Имитация обновления данных
    setTimeout(() => {
      setWeatherData(mockWeatherData);
      setLoading(false);
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="animate-spin text-light-accent dark:text-dark-accent" size={24} />
        <span className="ml-2 text-light-shadow dark:text-dark-light">
          {t('common:loading')}
        </span>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500 mb-2">{error || t('widgets:weather.weatherApiError')}</p>
        <button
          onClick={refreshWeather}
          className="btn-secondary text-sm"
        >
          {t('common:retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Основная информация */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin size={16} className="text-light-shadow dark:text-dark-light/70" />
          <span className="text-sm text-light-shadow dark:text-dark-light/70">
            {weatherData.location}
          </span>
        </div>
        <button
          onClick={refreshWeather}
          className="p-1 hover:bg-light-shadow/20 dark:hover:bg-dark-accent/20 rounded transition-colors"
        >
          <RefreshCw size={16} className="text-light-shadow dark:text-dark-light/70" />
        </button>
      </div>

      {/* Текущая погода */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {getWeatherIcon(weatherData.icon, 48)}
          <div>
            <div className="text-3xl font-bold text-light-text dark:text-dark-light">
              {weatherData.temperature}°C
            </div>
            <div className="text-sm text-light-shadow dark:text-dark-light/70">
              {weatherData.condition}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-light-shadow dark:text-dark-light/70">
            {t('widgets:weather.feelsLike')}
          </div>
          <div className="text-lg font-medium text-light-text dark:text-dark-light">
            {weatherData.feelsLike}°C
          </div>
        </div>
      </div>

      {/* Детали погоды */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center space-x-2">
          <Droplets size={16} className="text-blue-500" />
          <span className="text-light-shadow dark:text-dark-light/70">
            {weatherData.humidity}%
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Wind size={16} className="text-gray-500" />
          <span className="text-light-shadow dark:text-dark-light/70">
            {weatherData.windSpeed} км/ч
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Gauge size={16} className="text-purple-500" />
          <span className="text-light-shadow dark:text-dark-light/70">
            {weatherData.pressure} мб
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Eye size={16} className="text-green-500" />
          <span className="text-light-shadow dark:text-dark-light/70">
            {weatherData.visibility} км
          </span>
        </div>
      </div>

      {/* Восход/закат */}
      <div className="flex items-center justify-between pt-2 border-t border-light-shadow/20 dark:border-dark-accent/20">
        <div className="flex items-center space-x-2">
          <Sunrise size={16} className="text-orange-500" />
          <span className="text-sm text-light-shadow dark:text-dark-light/70">
            {weatherData.sunrise}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Sunset size={16} className="text-red-500" />
          <span className="text-sm text-light-shadow dark:text-dark-light/70">
            {weatherData.sunset}
          </span>
        </div>
      </div>

      {/* Прогноз на 5 дней */}
      {config.settings?.showForecast && (
        <div className="pt-2 border-t border-light-shadow/20 dark:border-dark-accent/20">
          <button
            onClick={() => setShowForecast(!showForecast)}
            className="text-sm font-medium text-light-accent dark:text-dark-accent hover:text-light-accent-secondary dark:hover:text-dark-accent-secondary transition-colors mb-2"
          >
            {t('widgets:weather.forecast')} {showForecast ? '▼' : '▶'}
          </button>
          
          {showForecast && (
            <div className="space-y-2">
              {weatherData.forecast.slice(0, config.settings?.forecastDays || 5).map((day, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    {getWeatherIcon(day.icon, 20)}
                    <span className="text-light-text dark:text-dark-light min-w-0 flex-1">
                      {index === 0 ? t('common:today') : 
                       new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                    </span>
                  </div>
                  <div className="text-light-shadow dark:text-dark-light/70">
                    <span className="font-medium">{day.maxTemp}°</span>
                    <span className="text-xs ml-1">{day.minTemp}°</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;