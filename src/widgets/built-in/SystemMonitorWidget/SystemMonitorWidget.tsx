import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, BatteryCharging, Layers, Cpu } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import type { SystemMonitorSettings } from './types';

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

export const SystemMonitorWidget: React.FC<WidgetProps<SystemMonitorSettings>> = ({ settings }) => {
  const showNetwork = settings?.showNetwork ?? true;
  const showBattery = settings?.showBattery ?? true;
  const showTabs = settings?.showTabs ?? true;
  const showMemory = settings?.showMemory ?? true;
  const layoutStyle = settings?.layoutStyle || 'grid';
  const refreshInterval = Math.max(1, settings?.refreshInterval || 2);

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [tabCount, setTabCount] = useState<number | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let batteryInstance: BatteryManager | null = null;
    let updateBatteryListener: (() => void) | null = null;

    // Батарея
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as unknown as { getBattery: () => Promise<BatteryManager> })
        .getBattery()
        .then((battery) => {
          batteryInstance = battery;
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          updateBatteryListener = () => {
            setBatteryLevel(Math.round(battery.level * 100));
            setIsCharging(battery.charging);
          };

          battery.addEventListener('levelchange', updateBatteryListener);
          battery.addEventListener('chargingchange', updateBatteryListener);
        })
        .catch(() => {});
    }

    const updateMetrics = () => {
      // Подсчёт вкладок через Chrome API
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({}, (tabs) => {
          if (tabs) setTabCount(tabs.length);
        });
      }

      // Использование памяти JS Heap
      const perfMem = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
      if (perfMem?.usedJSHeapSize) {
        setMemoryUsage(Math.round(perfMem.usedJSHeapSize / (1024 * 1024)));
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, refreshInterval * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      if (batteryInstance && updateBatteryListener) {
        batteryInstance.removeEventListener('levelchange', updateBatteryListener);
        batteryInstance.removeEventListener('chargingchange', updateBatteryListener);
      }
    };
  }, [refreshInterval]);

  if (layoutStyle === 'bars') {
    return (
      <div className="flex flex-col justify-center h-full w-full gap-2.5 p-3 select-none">
        {showMemory && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-semibold text-fg">
              <span className="flex items-center gap-1.5 text-secondary">
                <Cpu className="w-3.5 h-3.5" /> Память JS Heap
              </span>
              <span className="font-mono text-fg-muted">{memoryUsage ?? 0} МБ</span>
            </div>
            <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-line">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, ((memoryUsage || 30) / 250) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {showBattery && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-semibold text-fg">
              <span className="flex items-center gap-1.5 text-warning">
                {isCharging ? <BatteryCharging className="w-3.5 h-3.5" /> : <Battery className="w-3.5 h-3.5" />}
                Батарея
              </span>
              <span className="font-mono text-fg-muted">
                {batteryLevel !== null ? `${batteryLevel}%` : 'Сеть AC'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-line">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  batteryLevel !== null && batteryLevel <= 20
                    ? 'bg-danger'
                    : isCharging
                      ? 'bg-warning'
                      : 'bg-primary',
                )}
                style={{ width: `${batteryLevel !== null ? batteryLevel : 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-line text-[11px] text-fg-muted font-medium">
          {showNetwork && (
            <span className="flex items-center gap-1">
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-success" /> : <WifiOff className="w-3.5 h-3.5 text-danger" />}
              {isOnline ? 'Онлайн' : 'Офлайн'}
            </span>
          )}
          {showTabs && tabCount !== null && (
            <span className="flex items-center gap-1 font-mono">
              <Layers className="w-3.5 h-3.5 text-primary" />
              {tabCount} вкладок
            </span>
          )}
        </div>
      </div>
    );
  }

  // Режим Grid
  return (
    <div className="grid grid-cols-2 gap-2 h-full p-2 select-none items-center">
      {/* Сеть */}
      {showNetwork && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-line">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-success shrink-0" />
          ) : (
            <WifiOff className="w-5 h-5 text-danger shrink-0" />
          )}
          <div className="min-w-0">
            <span className="text-xs font-semibold text-fg block truncate">Сеть</span>
            <p className="text-[10px] text-fg-muted font-medium truncate">
              {isOnline ? 'Подключено' : 'Офлайн'}
            </p>
          </div>
        </div>
      )}

      {/* Батарея */}
      {showBattery && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-line">
          {isCharging ? (
            <BatteryCharging className="w-5 h-5 text-warning shrink-0" />
          ) : (
            <Battery
              className={cn(
                'w-5 h-5 shrink-0',
                batteryLevel !== null && batteryLevel <= 20 ? 'text-danger' : 'text-info',
              )}
            />
          )}
          <div className="min-w-0">
            <span className="text-xs font-semibold text-fg block truncate">Батарея</span>
            <p className="text-[10px] text-fg-muted font-medium truncate">
              {batteryLevel !== null ? `${batteryLevel}%` : 'Сеть AC'}
            </p>
          </div>
        </div>
      )}

      {/* Вкладки */}
      {showTabs && tabCount !== null && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-line">
          <Layers className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-fg block truncate">Вкладки</span>
            <p className="text-[10px] text-fg-muted font-medium truncate">
              {tabCount} открыто
            </p>
          </div>
        </div>
      )}

      {/* Память */}
      {showMemory && memoryUsage !== null && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-line">
          <Cpu className="w-5 h-5 text-secondary shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-fg block truncate">Память JS</span>
            <p className="text-[10px] text-fg-muted font-medium truncate">
              {memoryUsage} МБ
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
