import { useState, useEffect, useMemo, memo } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetComponentProps, WidgetSettingsProps } from '../types';

type TimeFormat = '12h' | '24h';

interface ClockConfig {
  showSeconds?: boolean;
  showDate?: boolean;
  timeFormat?: TimeFormat;
  locale?: string;
}

function useClock(showSeconds: boolean) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (showSeconds) {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }
    const tick = () => setNow(new Date());
    const msToNextMinute =
      (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds();
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [showSeconds]);

  return now;
}

function formatTime(
  date: Date,
  options: { hour12: boolean; showSeconds: boolean; locale: string }
): string {
  return date.toLocaleTimeString(options.locale || undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: options.showSeconds ? '2-digit' : undefined,
    hour12: options.hour12,
  });
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale || undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

const ClockComponent = memo(function ClockComponent({
  config,
}: WidgetComponentProps<ClockConfig>) {
  const showSeconds = config.showSeconds ?? true;
  const showDate = config.showDate ?? true;
  const hour12 = (config.timeFormat ?? '12h') === '12h';
  const locale = config.locale ?? navigator.language;

  const now = useClock(showSeconds);

  const time = useMemo(
    () => formatTime(now, { hour12, showSeconds, locale }),
    [now.getTime(), hour12, showSeconds, locale]
  );

  const date = useMemo(
    () => (showDate ? formatDate(now, locale) : null),
    [
      showDate ? now.getDate() : 0,
      showDate ? now.getMonth() : 0,
      showDate ? now.getFullYear() : 0,
      showDate ? now.getDay() : 0,
      showDate,
      locale,
    ]
  );

  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-200">
      <div className="text-3xl font-light tabular-nums">{time}</div>
      {date && <div className="text-sm text-slate-500 mt-1">{date}</div>}
    </div>
  );
});

function ClockSettingsPanel({
  instanceId,
  config,
  onConfigChange,
}: WidgetSettingsProps<ClockConfig>) {
  const radioName = `clock-format-${instanceId}`;
  return (
    <div className="space-y-3 p-3 text-sm">
      <div>
        <span className="block text-slate-400 text-xs mb-1">Time format</span>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={radioName}
              checked={(config.timeFormat ?? '12h') === '12h'}
              onChange={() => onConfigChange({ timeFormat: '12h' })}
              className="text-slate-400"
            />
            12-hour
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={radioName}
              checked={(config.timeFormat ?? '12h') === '24h'}
              onChange={() => onConfigChange({ timeFormat: '24h' })}
              className="text-slate-400"
            />
            24-hour
          </label>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showSeconds ?? true}
          onChange={(e) => onConfigChange({ showSeconds: e.target.checked })}
          className="rounded border-slate-600 bg-slate-800 text-slate-400"
        />
        Show seconds
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showDate ?? true}
          onChange={(e) => onConfigChange({ showDate: e.target.checked })}
          className="rounded border-slate-600 bg-slate-800 text-slate-400"
        />
        Show date
      </label>
      <div>
        <label htmlFor={`clock-locale-${instanceId}`} className="block text-slate-400 text-xs mb-1">
          Locale
        </label>
        <input
          id={`clock-locale-${instanceId}`}
          type="text"
          value={config.locale ?? ''}
          onChange={(e) => onConfigChange({ locale: e.target.value || undefined })}
          placeholder={navigator.language}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800/50 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
        />
      </div>
    </div>
  );
});

const clockDefinition: WidgetDefinition<ClockConfig> = {
  metadata: {
    type: 'clock',
    name: 'Clock',
    description: 'Digital clock with configurable time format',
  },
  component: ClockComponent,
  defaultSize: { w: 4, h: 2, minW: 2, minH: 1 },
  SettingsPanel: ClockSettingsPanel,
  defaultConfig: {
    showSeconds: true,
    showDate: true,
    timeFormat: '12h',
  },
};

registerWidget(clockDefinition);
