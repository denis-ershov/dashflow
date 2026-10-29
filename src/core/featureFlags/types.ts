/**
 * Контракты и схема флагов функциональности (Feature Flags) DashFlow
 * Обеспечивают безопасный постепенный запуск фич и возможность их аварийного отключения
 * (Senior Architecture, Правила 23, 24, 30)
 */

export interface FeatureFlags {
  /** Процедурный синтезатор звуков окружения (Web Audio API) */
  ambientAudio: boolean;
  /** Сбор локальных метрик Core Web Vitals и производительности */
  webVitalsMonitoring: boolean;
}

export type FeatureFlagKey = keyof FeatureFlags;

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  title: string;
  description: string;
  defaultValue: boolean;
  isExperimental?: boolean;
}
