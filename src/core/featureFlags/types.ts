/**
 * Контракты и схема флагов функциональности (Feature Flags) DashFlow
 * Обеспечивают безопасный постепенный запуск фич и возможность их аварийного отключения
 * (Senior Architecture, Правила 23, 24, 30)
 */

export interface FeatureFlags {
  /** Поддержка современных AI-поисковиков в SearchWidget (ChatGPT, Claude, Perplexity) */
  aiSearchEngines: boolean;
  /** Процедурный синтезатор звуков окружения (Web Audio API) */
  ambientAudio: boolean;
  /** Детальные горизонтальные шкалы в SystemMonitorWidget */
  systemMonitorBars: boolean;
  /** Сбор локальных метрик Core Web Vitals и производительности */
  webVitalsMonitoring: boolean;
  /** Индикатор автономного режима (Offline State) */
  offlineIndicator: boolean;
  /** Экспериментальная среда запуска пользовательских плагинов */
  experimentalPlugins: boolean;
}

export type FeatureFlagKey = keyof FeatureFlags;

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  title: string;
  description: string;
  defaultValue: boolean;
  isExperimental?: boolean;
}
