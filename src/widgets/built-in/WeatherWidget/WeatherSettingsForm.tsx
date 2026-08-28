import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Sparkles, LayoutDashboard, Minimize2, Clock, Calendar, RefreshCw, Check } from 'lucide-react';
import { Switch } from '@/ui/primitives/Switch';
import { Select } from '@/ui/primitives/Select';
import { cn } from '@/ui/lib/cn';
import type { CitySearchResult, WeatherSettings, WeatherViewMode } from './types';
import { detectUserLocation, searchCities } from './weatherService';

interface WeatherSettingsFormProps {
  settings: WeatherSettings;
  onChange: (newSettings: WeatherSettings) => void;
}

const VIEW_MODES: { id: WeatherViewMode; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    title: 'Метеостанция',
    desc: 'Полный обзор: текущая, 24ч таймлайн, 7 дней и метрики',
    icon: <LayoutDashboard className="w-4 h-4 text-primary" />,
  },
  {
    id: 'compact',
    title: 'Компактный',
    desc: 'Плотный карточный вид для небольших ячеек',
    icon: <Minimize2 className="w-4 h-4 text-secondary" />,
  },
  {
    id: 'hourly',
    title: 'По часам',
    desc: 'Акцент на подробный поминутный прогноз суток',
    icon: <Clock className="w-4 h-4 text-accent" />,
  },
  {
    id: 'weekly',
    title: 'На 7 дней',
    desc: 'Расширенный недельный график с термо-барами',
    icon: <Calendar className="w-4 h-4 text-warning" />,
  },
];

export const WeatherSettingsForm: React.FC<WeatherSettingsFormProps> = ({ settings, onChange }) => {
  const [cityInput, setCityInput] = useState(settings.city || 'Москва');
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Живые подсказки городов
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCityInput(settings.city || 'Москва');
    setIsUserEditing(false);
  }, [settings.city]);

  // Дебаунс живого поиска городов (только если пользователь сам вводит текст)
  useEffect(() => {
    if (!isUserEditing || !cityInput || cityInput.trim().length < 2 || settings.autoLocation) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchCities(cityInput);
        setSuggestions(res);
        setShowSuggestions(res.length > 0);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cityInput, settings.autoLocation, isUserEditing]);

  // Закрытие подсказок при клике вне поля
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleDetectGeo = async () => {
    setIsDetectingLocation(true);
    setLocationError(null);
    setIsUserEditing(false);
    setShowSuggestions(false);
    try {
      const coords = await detectUserLocation();
      onChange({
        ...settings,
        city: coords.name || 'Моё местоположение',
        autoLocation: true,
        coords,
      });
      setCityInput(coords.name || 'Моё местоположение');
      setShowSuggestions(false);
    } catch (err: any) {
      setLocationError(err.message || 'Ошибка определения геолокации');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSelectCity = (item: CitySearchResult) => {
    setIsUserEditing(false);
    setCityInput(item.name);
    setShowSuggestions(false);
    onChange({
      ...settings,
      city: item.name,
      autoLocation: false,
      coords: {
        lat: item.latitude,
        lon: item.longitude,
        name: item.name,
        country: item.country,
      },
    });
  };

  return (
    <div className="space-y-6 select-none">
      {/* 1. Блок локации и города */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
            Местоположение
          </label>
          <button
            type="button"
            onClick={handleDetectGeo}
            disabled={isDetectingLocation}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            {isDetectingLocation ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            <span>Определить геопозицию</span>
          </button>
        </div>

        {/* Поле поиска города */}
        <div className="relative" ref={searchWrapperRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-fg-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={cityInput}
              onChange={(e) => {
                setIsUserEditing(true);
                setCityInput(e.target.value);
                if (settings.autoLocation) {
                  onChange({ ...settings, autoLocation: false });
                }
              }}
              onFocus={() => {
                if (isUserEditing && suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Введите город (напр. Москва, Сочи, Лондон)..."
              className="w-full bg-surface border border-line rounded-xl pl-9 pr-8 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            {isSearching && (
              <RefreshCw className="w-3.5 h-3.5 text-primary absolute right-3 animate-spin" />
            )}
          </div>

          {/* Подсказки городов */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#161922] border border-line rounded-xl shadow-3 overflow-hidden p-1 backdrop-blur-xl animate-fade-in">
              <div className="text-[10px] font-semibold text-fg-dim px-2.5 py-1 uppercase tracking-wider">
                Найденные города
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectCity(item)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold text-fg">{item.name}</span>
                      {item.admin1 && <span className="text-fg-dim text-[11px]">, {item.admin1}</span>}
                    </div>
                    {item.country && (
                      <span className="text-[10px] text-fg-muted bg-canvas/60 px-1.5 py-0.5 rounded">
                        {item.country}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {locationError && (
          <p className="text-xs text-danger flex items-center gap-1 mt-1">
            <span>⚠️</span> {locationError}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-fg">Авто-обновление гео</span>
            <p className="text-[11px] text-fg-muted">Определять текущее положение браузера при открытии</p>
          </div>
          <Switch
            checked={settings.autoLocation || false}
            onChange={(checked) => {
              if (checked) {
                handleDetectGeo();
              } else {
                onChange({ ...settings, autoLocation: false });
              }
            }}
          />
        </div>
      </div>

      <div className="h-px bg-line/60" />

      {/* 2. Выбор стиля макета */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
          Стиль отображения виджета
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VIEW_MODES.map((mode) => {
            const isSelected = (settings.viewMode || 'dashboard') === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onChange({ ...settings, viewMode: mode.id })}
                className={cn(
                  'flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-1 ring-1 ring-primary/40'
                    : 'bg-surface border-line hover:border-line-hover hover:bg-surface-hover',
                )}
              >
                <div className="shrink-0 mt-0.5 p-1 rounded-lg bg-canvas/80">{mode.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fg">{mode.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                  </div>
                  <p className="text-[11px] text-fg-muted mt-0.5 line-clamp-2 leading-tight">
                    {mode.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-line/60" />

      {/* 3. Единицы измерения */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
          Единицы измерения
        </label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            label="Температура"
            value={settings.tempUnit || 'celsius'}
            onChange={(e) => onChange({ ...settings, tempUnit: e.target.value as any })}
            options={[
              { value: 'celsius', label: '°C (Цельсий)' },
              { value: 'fahrenheit', label: '°F (Фаренгейт)' },
            ]}
          />
          <Select
            label="Скорость ветра"
            value={settings.windSpeedUnit || 'ms'}
            onChange={(e) => onChange({ ...settings, windSpeedUnit: e.target.value as any })}
            options={[
              { value: 'ms', label: 'м/с' },
              { value: 'kmh', label: 'км/ч' },
              { value: 'mph', label: 'миль/ч' },
            ]}
          />
          <Select
            label="Давление"
            value={settings.pressureUnit || 'mmhg'}
            onChange={(e) => onChange({ ...settings, pressureUnit: e.target.value as any })}
            options={[
              { value: 'mmhg', label: 'мм рт. ст.' },
              { value: 'hpa', label: 'гПа (hPa)' },
            ]}
          />
        </div>
      </div>

      <div className="h-px bg-line/60" />

      {/* 4. Тумблеры информационных секций */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
          Отображение секций и параметров
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">Почасовой таймлайн (24 часа)</span>
            <Switch
              checked={settings.showHourly !== false}
              onChange={(checked) => onChange({ ...settings, showHourly: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">Прогноз на 7 дней (термо-бары)</span>
            <Switch
              checked={settings.showDaily !== false}
              onChange={(checked) => onChange({ ...settings, showDaily: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">Сетка атмосферных параметров</span>
            <Switch
              checked={settings.showMetrics !== false}
              onChange={(checked) => onChange({ ...settings, showMetrics: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">УФ-индекс безопасности</span>
            <Switch
              checked={settings.showUv !== false}
              onChange={(checked) => onChange({ ...settings, showUv: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">Восход и закат солнца</span>
            <Switch
              checked={settings.showSunTimes !== false}
              onChange={(checked) => onChange({ ...settings, showSunTimes: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">«Ощущается как» температура</span>
            <Switch
              checked={settings.showFeelsLike !== false}
              onChange={(checked) => onChange({ ...settings, showFeelsLike: checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
