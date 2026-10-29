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

/** Название и описание флага — ключи featureFlags.<key>.title|description в словаре */
export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  defaultValue: boolean;
  isExperimental?: boolean;
}
