/**
 * Контракты подсистемы наблюдаемости, сбора диагностических данных и телеметрии DashFlow
 */

export type CrashLevel = 'error' | 'warning' | 'fatal';
export type CrashContext = 'root' | 'widget' | 'network' | 'storage' | 'plugin' | 'theme' | 'general';

export interface CrashReport {
  id: string;
  timestamp: number;
  level: CrashLevel;
  context: CrashContext;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  meta?: Record<string, string | number | boolean>;
  version: string;
  userAgent: string;
  url?: string;
}

export interface WebVitalsMetrics {
  /** Largest Contentful Paint (ms) */
  lcp: number | null;
  /** Cumulative Layout Shift */
  cls: number | null;
  /** Interaction to Next Paint or First Input Delay (ms) */
  inp: number | null;
  /** Navigation timing metrics */
  domContentLoaded: number | null;
  loadTime: number | null;
  /** Memory usage stats (Chromium performance.memory) */
  memory?: {
    usedJSHeapSizeMb: number;
    totalJSHeapSizeMb: number;
    jsHeapSizeLimitMb: number;
  };
}

export interface SystemDiagnostics {
  appVersion: string;
  platform: string;
  online: boolean;
  screenResolution: string;
  uptimeSeconds: number;
  storageEstimate?: {
    usedMb: number;
    quotaMb: number;
  };
  webVitals: WebVitalsMetrics;
  recentErrorsCount: number;
  recentWarningsCount: number;
}
