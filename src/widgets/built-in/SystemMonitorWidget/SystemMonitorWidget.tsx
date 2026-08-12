import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, BatteryCharging, Cpu } from 'lucide-react';

export interface SystemMonitorWidgetProps {
  instanceId: string;
}

export const SystemMonitorWidget: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 h-full items-center">
      {/* Сеть */}
      <div className="flex items-center space-x-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        {isOnline ? (
          <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <WifiOff className="w-5 h-5 text-rose-400 shrink-0" />
        )}
        <div>
          <span className="text-xs font-semibold text-[var(--color-text)]">Сеть</span>
          <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
            {isOnline ? 'Подключено' : 'Офлайн'}
          </p>
        </div>
      </div>

      {/* Батарея */}
      <div className="flex items-center space-x-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        {isCharging ? (
          <BatteryCharging className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
        ) : (
          <Battery className="w-5 h-5 text-sky-400 shrink-0" />
        )}
        <div>
          <span className="text-xs font-semibold text-[var(--color-text)]">Батарея</span>
          <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
            {batteryLevel !== null ? `${batteryLevel}%` : 'Сеть AC'}
          </p>
        </div>
      </div>
    </div>
  );
};
