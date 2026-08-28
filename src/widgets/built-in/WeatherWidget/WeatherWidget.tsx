import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Droplets,
  Wind,
  Compass,
  Gauge,
  Sunrise,
  Sunset,
  Eye,
  ShieldAlert,
  MapPin,
  RefreshCw,
  Calendar,
  Clock,
  LayoutDashboard,
  Sliders,
} from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { Skeleton } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type {
  DailyForecastItem,
  HourlyForecastItem,
  WeatherSettings,
  WeatherData,
} from './types';
import {
  fetchFullWeatherData,
  formatPressure,
  formatTemperature,
  formatWindSpeed,
  getUvIndexInfo,
  getWeatherDescription,
  getWindDirectionText,
} from './weatherService';

export const WeatherWidget: React.FC<WidgetProps<WeatherSettings>> = ({ settings }) => {
  const city = settings?.city || 'Москва';
  const autoLocation = settings?.autoLocation;
  const coords = settings?.coords;
  const viewMode = settings?.viewMode || 'dashboard';
  const tempUnit = settings?.tempUnit || 'celsius';
  const windSpeedUnit = settings?.windSpeedUnit || 'ms';
  const pressureUnit = settings?.pressureUnit || 'mmhg';

  const showHourly = settings?.showHourly !== false;
  const showDaily = settings?.showDaily !== false;
  const showMetrics = settings?.showMetrics !== false;
  const showFeelsLike = settings?.showFeelsLike !== false;
  const showUv = settings?.showUv !== false;
  const showSunTimes = settings?.showSunTimes !== false;
  const showHumidity = settings?.showHumidity !== false;
  const showWind = settings?.showWind !== false;

  // Внутренний интерактивный таб (для режима dashboard)
  const [activeTab, setActiveTab] = useState<'overview' | 'hourly' | 'daily' | 'metrics'>('overview');

  const { data, isLoading, isFetching, error, refetch } = useQuery<WeatherData>({
    queryKey: ['weather', city, autoLocation, coords?.lat, coords?.lon],
    queryFn: () => fetchFullWeatherData({ city, coords, autoLocation }),
    staleTime: 1000 * 60 * 20, // 20 минут
    refetchOnWindowFocus: false,
  });

  // Расчет глобального недельного минимума и максимума для термо-баров
  const weekExtremes = useMemo(() => {
    if (!data?.daily || data.daily.length === 0) return { min: 0, max: 30 };
    let min = Infinity;
    let max = -Infinity;
    data.daily.forEach((d) => {
      if (d.minTemp < min) min = d.minTemp;
      if (d.maxTemp > max) max = d.maxTemp;
    });
    return { min, max: Math.max(max, min + 1) };
  }, [data?.daily]);

  // Подбор погодной иконки
  const getWeatherIcon = (code?: number, isDay = true, sizeClass = 'w-8 h-8') => {
    if (code === undefined) return <CloudSun className={cn(sizeClass, 'text-primary')} />;
    if (code === 0) {
      return isDay ? (
        <Sun className={cn(sizeClass, 'text-amber-400 fill-amber-400/20')} />
      ) : (
        <Moon className={cn(sizeClass, 'text-indigo-300 fill-indigo-300/20')} />
      );
    }
    if (code >= 1 && code <= 2) {
      return isDay ? (
        <CloudSun className={cn(sizeClass, 'text-amber-300')} />
      ) : (
        <CloudMoon className={cn(sizeClass, 'text-indigo-300')} />
      );
    }
    if (code === 3) return <Cloud className={cn(sizeClass, 'text-slate-400')} />;
    if (code === 45 || code === 48) return <CloudFog className={cn(sizeClass, 'text-teal-300')} />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return <CloudRain className={cn(sizeClass, 'text-cyan-400')} />;
    }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
      return <CloudSnow className={cn(sizeClass, 'text-blue-200')} />;
    }
    if (code >= 95) return <CloudLightning className={cn(sizeClass, 'text-amber-400 animate-pulse')} />;
    return <Cloud className={cn(sizeClass, 'text-slate-400')} />;
  };

  // Погодный фоновый акцент
  const weatherGlow = useMemo(() => {
    if (!data) return 'from-primary/5 via-transparent to-transparent';
    const code = data.weathercode;
    const isDay = data.metrics?.isDay !== false;
    if (code === 0 && isDay) return 'from-amber-500/10 via-amber-500/5 to-transparent';
    if (code === 0 && !isDay) return 'from-indigo-600/15 via-indigo-900/10 to-transparent';
    if (code >= 95) return 'from-purple-600/15 via-amber-500/10 to-transparent';
    if (code >= 51 && code <= 67) return 'from-cyan-600/15 via-blue-600/5 to-transparent';
    if (code >= 71 && code <= 77) return 'from-blue-400/15 via-teal-500/5 to-transparent';
    return 'from-primary/10 via-transparent to-transparent';
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-between h-full p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="w-24 h-9 rounded-xl" />
            <Skeleton className="w-32 h-4 rounded-lg" />
          </div>
          <Skeleton className="w-12 h-12 rounded-2xl" />
        </div>
        <div className="grid grid-cols-4 gap-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="w-full h-10 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-3">
        <div className="p-3 rounded-2xl bg-danger/10 text-danger border border-danger/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-fg">Не удалось загрузить погоду</h4>
          <p className="text-xs text-fg-muted mt-1">Проверьте подключение к сети или название города</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-fg text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Повторить</span>
        </button>
      </div>
    );
  }

  const uvInfo = getUvIndexInfo(data.metrics?.uvIndex);

  // 1. Компактный режим (Compact View)
  if (viewMode === 'compact') {
    return (
      <div className={cn('relative flex flex-col justify-between h-full p-3 select-none overflow-hidden bg-gradient-to-b', weatherGlow)}>
        {/* Шапка: Город + Обновление */}
        <div className="flex items-center justify-between text-xs text-fg-muted">
          <div className="flex items-center gap-1.5 min-w-0">
            {data.isAutoLocation && <MapPin className="w-3 h-3 text-primary shrink-0" />}
            <span className="font-semibold text-fg truncate">{data.city}</span>
            {data.isOffline && (
              <span className="text-[10px] text-amber-400 bg-amber-500/15 px-1 rounded">Офлайн</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Обновить погоду"
            className="p-1 text-fg-muted hover:text-fg rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin text-primary')} />
          </button>
        </div>

        {/* Hero температура и иконка */}
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg font-sofia">
                {formatTemperature(data.temperature, tempUnit)}
              </span>
              {showFeelsLike && data.metrics?.feelsLike !== undefined && (
                <span className="text-[11px] text-fg-muted">
                  ощущ. {formatTemperature(data.metrics.feelsLike, tempUnit)}
                </span>
              )}
            </div>
            <p className="text-xs text-fg-dim truncate max-w-[150px] mt-0.5">
              {getWeatherDescription(data.weathercode, data.metrics?.isDay)}
            </p>
          </div>
          <div className="flex flex-col items-end">
            {getWeatherIcon(data.weathercode, data.metrics?.isDay, 'w-9 h-9')}
            <span className="text-[11px] text-fg-muted mt-1 font-mono">
              {data.minTemp}° / {data.maxTemp}°
            </span>
          </div>
        </div>

        {/* Нижние параметры */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60 text-xs">
          {showHumidity && (
            <div className="flex items-center gap-1.5 text-fg-muted">
              <Droplets className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{data.metrics?.humidity ?? 60}%</span>
            </div>
          )}
          {showWind && (
            <div className="flex items-center gap-1.5 text-fg-muted">
              <Wind className="w-3.5 h-3.5 text-secondary shrink-0" />
              <span>{formatWindSpeed(data.metrics?.windSpeed ?? 3, windSpeedUnit)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Режим "По часам" (Hourly Focused View)
  if (viewMode === 'hourly') {
    return (
      <div className={cn('relative flex flex-col h-full p-3 select-none overflow-hidden bg-gradient-to-b', weatherGlow)}>
        {/* Шапка */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-fg truncate">{data.city}</span>
            <span className="text-[11px] text-fg-muted">• 24-часовой прогноз</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 text-fg-muted hover:text-fg rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin text-primary')} />
          </button>
        </div>

        {/* Список 24 часов */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {data.hourly.map((h, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-surface/40 hover:bg-surface/70 border border-line/40 transition-colors"
            >
              <span className="text-xs font-medium text-fg-muted w-14 font-mono">{h.time}</span>
              <div className="flex items-center gap-2">
                {getWeatherIcon(h.code, h.isDay, 'w-4 h-4')}
                {h.precipitationProbability !== undefined && h.precipitationProbability > 15 && (
                  <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-0.5">
                    💧 {h.precipitationProbability}%
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-fg font-sofia">
                {formatTemperature(h.temp, tempUnit)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Режим "На 7 дней" (Weekly Focused View)
  if (viewMode === 'weekly') {
    return (
      <div className={cn('relative flex flex-col h-full p-3 select-none overflow-hidden bg-gradient-to-b', weatherGlow)}>
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-bold text-fg truncate">{data.city} • 7 дней</span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 text-fg-muted hover:text-fg rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin text-primary')} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {data.daily.map((day, idx) => (
            <DailyRow
              key={idx}
              item={day}
              weekMin={weekExtremes.min}
              weekMax={weekExtremes.max}
              tempUnit={tempUnit}
              getWeatherIcon={getWeatherIcon}
            />
          ))}
        </div>
      </div>
    );
  }

  // 4. Главный режим: Умная Метеостанция (Dashboard Mode)
  return (
    <div className={cn('relative flex flex-col h-full select-none overflow-hidden bg-gradient-to-b', weatherGlow)}>
      {/* 1. Верхняя панель: Город, маркер геолокации, кнопки табов и обновление */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1 border-b border-line/40 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {data.isAutoLocation ? (
            <span title="Определено по геолокации" className="text-primary flex items-center">
              <MapPin className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
          )}
          <span className="text-xs font-bold text-fg truncate">{data.city}</span>
          {data.isOffline && (
            <span className="text-[10px] text-amber-400 bg-amber-500/15 px-1 py-0.5 rounded font-medium">
              Офлайн
            </span>
          )}
        </div>

        {/* Быстрые табы режима */}
        <div className="flex items-center gap-1">
          <div className="flex items-center p-0.5 rounded-lg bg-surface border border-line/60">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              title="Общий обзор"
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                activeTab === 'overview' ? 'bg-primary text-primary-fg shadow-1' : 'text-fg-muted hover:text-fg',
              )}
            >
              Обзор
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hourly')}
              title="По часам"
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                activeTab === 'hourly' ? 'bg-primary text-primary-fg shadow-1' : 'text-fg-muted hover:text-fg',
              )}
            >
              24ч
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              title="На 7 дней"
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                activeTab === 'daily' ? 'bg-primary text-primary-fg shadow-1' : 'text-fg-muted hover:text-fg',
              )}
            >
              7 дн.
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              title="Атмосферные параметры"
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                activeTab === 'metrics' ? 'bg-primary text-primary-fg shadow-1' : 'text-fg-muted hover:text-fg',
              )}
            >
              Детали
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Обновить погоду"
            className="p-1.5 text-fg-muted hover:text-fg rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>

      {/* 2. Контентная часть */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {/* Обзорный таб */}
        {activeTab === 'overview' && (
          <>
            {/* Hero блок текущей температуры */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface/40 border border-line/40 backdrop-blur-md">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg font-sofia">
                    {formatTemperature(data.temperature, tempUnit)}
                  </span>
                  {showFeelsLike && data.metrics?.feelsLike !== undefined && (
                    <span className="text-xs text-fg-muted">
                      Ощущается как {formatTemperature(data.metrics.feelsLike, tempUnit)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-medium text-fg">
                    {getWeatherDescription(data.weathercode, data.metrics?.isDay)}
                  </span>
                  <span className="text-[11px] text-fg-dim font-mono">• {data.minTemp}° / {data.maxTemp}°</span>
                </div>
              </div>

              <div className="p-2 rounded-2xl bg-surface/60 shadow-1 border border-line/40">
                {getWeatherIcon(data.weathercode, data.metrics?.isDay, 'w-9 h-9 sm:w-10 sm:h-10')}
              </div>
            </div>

            {/* Горизонтальный таймлайн на 24 часа */}
            {showHourly && data.hourly && data.hourly.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-fg-muted px-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" /> Почасовой прогноз
                  </span>
                  <span className="text-[10px] text-fg-dim">24 часа</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
                  {data.hourly.slice(0, 12).map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-xl border min-w-[56px] shrink-0 transition-all text-center',
                        i === 0
                          ? 'bg-primary/15 border-primary/40 shadow-1'
                          : 'bg-surface/40 border-line/40 hover:bg-surface/70',
                      )}
                    >
                      <span className="text-[10px] text-fg-muted font-mono">{h.time}</span>
                      {getWeatherIcon(h.code, h.isDay, 'w-4 h-4')}
                      <span className="text-xs font-bold text-fg font-sofia">
                        {formatTemperature(h.temp, tempUnit)}
                      </span>
                      {h.precipitationProbability !== undefined && h.precipitationProbability > 15 ? (
                        <span className="text-[9px] text-cyan-400 font-bold">💧{h.precipitationProbability}%</span>
                      ) : (
                        <span className="text-[9px] text-transparent select-none">-</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Компактный список 5 дней */}
            {showDaily && data.daily && data.daily.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-fg-muted px-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-secondary" /> Прогноз на неделю
                  </span>
                </div>
                <div className="space-y-1 bg-surface/30 p-2 rounded-2xl border border-line/40">
                  {data.daily.slice(0, 5).map((day, idx) => (
                    <DailyRow
                      key={idx}
                      item={day}
                      weekMin={weekExtremes.min}
                      weekMax={weekExtremes.max}
                      tempUnit={tempUnit}
                      getWeatherIcon={getWeatherIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Сетка параметров (Quick metrics) */}
            {showMetrics && (
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {showWind && (
                  <MetricCard
                    icon={<Wind className="w-4 h-4 text-cyan-400" />}
                    title="Ветер"
                    value={formatWindSpeed(data.metrics?.windSpeed ?? 0, windSpeedUnit)}
                    subtitle={`Направление: ${getWindDirectionText(data.metrics?.windDirection)}`}
                  />
                )}
                {showHumidity && (
                  <MetricCard
                    icon={<Droplets className="w-4 h-4 text-blue-400" />}
                    title="Влажность"
                    value={`${data.metrics?.humidity ?? 60}%`}
                    subtitle={`Точка росы в норме`}
                  />
                )}
                {showUv && (
                  <MetricCard
                    icon={<Sun className="w-4 h-4 text-amber-400" />}
                    title="УФ-индекс"
                    value={`${data.metrics?.uvIndex ?? 0}`}
                    badge={uvInfo.label}
                    badgeClass={uvInfo.badgeClass}
                  />
                )}
                <MetricCard
                  icon={<Gauge className="w-4 h-4 text-emerald-400" />}
                  title="Давление"
                  value={formatPressure(data.metrics?.pressure ?? 1013, pressureUnit)}
                  subtitle="Атмосферное"
                />
              </div>
            )}
          </>
        )}

        {/* Таб 24 часа */}
        {activeTab === 'hourly' && (
          <div className="space-y-1.5">
            {data.hourly.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-surface/40 hover:bg-surface/70 border border-line/40 transition-colors"
              >
                <span className="text-xs font-semibold text-fg-muted w-16 font-mono">{h.time}</span>
                <div className="flex items-center gap-3">
                  {getWeatherIcon(h.code, h.isDay, 'w-4 h-4')}
                  <span className="text-xs text-fg-dim hidden sm:inline">{getWeatherDescription(h.code, h.isDay)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {h.precipitationProbability !== undefined && h.precipitationProbability > 0 && (
                    <span className="text-[11px] text-cyan-400 font-semibold">
                      💧 {h.precipitationProbability}%
                    </span>
                  )}
                  <span className="text-xs font-bold text-fg font-sofia w-12 text-right">
                    {formatTemperature(h.temp, tempUnit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Таб 7 дней */}
        {activeTab === 'daily' && (
          <div className="space-y-1.5 bg-surface/30 p-2 rounded-2xl border border-line/40">
            {data.daily.map((day, idx) => (
              <DailyRow
                key={idx}
                item={day}
                weekMin={weekExtremes.min}
                weekMax={weekExtremes.max}
                tempUnit={tempUnit}
                getWeatherIcon={getWeatherIcon}
              />
            ))}
          </div>
        )}

        {/* Таб Атмосферные параметры */}
        {activeTab === 'metrics' && (
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              icon={<Wind className="w-4 h-4 text-cyan-400" />}
              title="Скорость ветра"
              value={formatWindSpeed(data.metrics?.windSpeed ?? 0, windSpeedUnit)}
              subtitle={`Порывы: ${formatWindSpeed(data.metrics?.windGusts ?? (data.metrics?.windSpeed ?? 0) * 1.3, windSpeedUnit)}`}
            />
            <MetricCard
              icon={<Compass className="w-4 h-4 text-primary" />}
              title="Направление ветра"
              value={getWindDirectionText(data.metrics?.windDirection)}
              subtitle={`${data.metrics?.windDirection ?? 0}° на компасе`}
            />
            <MetricCard
              icon={<Droplets className="w-4 h-4 text-blue-400" />}
              title="Влажность воздуха"
              value={`${data.metrics?.humidity ?? 60}%`}
              subtitle={data.metrics?.humidity && data.metrics.humidity > 70 ? 'Повышенная влажность' : 'Комфортный уровень'}
            />
            <MetricCard
              icon={<Gauge className="w-4 h-4 text-emerald-400" />}
              title="Давление"
              value={formatPressure(data.metrics?.pressure ?? 1013, pressureUnit)}
              subtitle="На уровне моря"
            />
            <MetricCard
              icon={<Sun className="w-4 h-4 text-amber-400" />}
              title="УФ-индекс (макс.)"
              value={`${data.metrics?.uvIndex ?? 0}`}
              badge={uvInfo.label}
              badgeClass={uvInfo.badgeClass}
            />
            <MetricCard
              icon={<Eye className="w-4 h-4 text-violet-400" />}
              title="Видимость"
              value={`${data.metrics?.visibility ?? 10} км`}
              subtitle="Отличная прозрачность"
            />
            {showSunTimes && data.metrics?.sunrise && (
              <MetricCard
                icon={<Sunrise className="w-4 h-4 text-amber-300" />}
                title="Восход солнца"
                value={data.metrics.sunrise}
                subtitle="Начало светового дня"
              />
            )}
            {showSunTimes && data.metrics?.sunset && (
              <MetricCard
                icon={<Sunset className="w-4 h-4 text-rose-400" />}
                title="Заход солнца"
                value={data.metrics.sunset}
                subtitle="Сумерки"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент строки прогноза на 1 день с Apple-style термо-баром
interface DailyRowProps {
  item: DailyForecastItem;
  weekMin: number;
  weekMax: number;
  tempUnit: any;
  getWeatherIcon: (code?: number, isDay?: boolean, sizeClass?: string) => React.ReactNode;
}

const DailyRow: React.FC<DailyRowProps> = ({ item, weekMin, weekMax, tempUnit, getWeatherIcon }) => {
  const range = weekMax - weekMin || 1;
  const leftPercent = Math.max(0, Math.min(100, ((item.minTemp - weekMin) / range) * 100));
  const rightPercent = Math.max(0, Math.min(100, ((weekMax - item.maxTemp) / range) * 100));

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl hover:bg-surface/50 transition-colors text-xs">
      <span className="font-semibold text-fg w-16 truncate">{item.dayName}</span>

      <div className="flex items-center gap-1.5 w-12 justify-center shrink-0">
        {getWeatherIcon(item.code, true, 'w-4 h-4')}
        {item.precipitationProbability !== undefined && item.precipitationProbability > 20 && (
          <span className="text-[9px] text-cyan-400 font-bold">💧</span>
        )}
      </div>

      {/* Термо-бар диапазона */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-[11px] text-fg-muted font-mono w-7 text-right">
          {formatTemperature(item.minTemp, tempUnit)}
        </span>

        <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden relative">
          <div
            className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400"
            style={{
              left: `${leftPercent}%`,
              right: `${rightPercent}%`,
            }}
          />
        </div>

        <span className="text-[11px] font-bold text-fg font-mono w-7">
          {formatTemperature(item.maxTemp, tempUnit)}
        </span>
      </div>
    </div>
  );
};

// Компонент карточки метрики
interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, subtitle, badge, badgeClass }) => (
  <div className="p-2.5 rounded-xl bg-surface/40 border border-line/40 backdrop-blur-sm space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-fg-muted flex items-center gap-1.5">
        {icon}
        <span className="truncate">{title}</span>
      </span>
      {badge && (
        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', badgeClass)}>
          {badge}
        </span>
      )}
    </div>
    <div className="text-sm font-bold text-fg font-sofia">{value}</div>
    {subtitle && <p className="text-[10px] text-fg-dim truncate">{subtitle}</p>}
  </div>
);
