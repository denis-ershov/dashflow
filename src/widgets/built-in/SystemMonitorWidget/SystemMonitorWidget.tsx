import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, BatteryCharging } from 'lucide-react';
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

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as unknown as { getBattery: () => Promise<BatteryManager> })
        .getBattery()
        .then((battery) => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          const updateBattery = () => {
            setBatteryLevel(Math.round(battery.level * 100));
            setIsCharging(battery.charging);
          };

          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2 h-full items-center p-2 select-none">
      {/* Сеть */}
      {showNetwork && (
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface/70 border border-line/60">
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
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface/70 border border-line/60">
          {isCharging ? (
            <BatteryCharging className="w-5 h-5 text-warning shrink-0 animate-pulse" />
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
    </div>
  );
};
