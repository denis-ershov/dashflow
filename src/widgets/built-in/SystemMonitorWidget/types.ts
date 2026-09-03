export interface SystemMonitorSettings {
  showBattery?: boolean;
  showNetwork?: boolean;
  showMemory?: boolean;
  showTabs?: boolean;
  refreshInterval?: number; // секунды
  layoutStyle?: 'grid' | 'bars';
}
