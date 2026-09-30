import type { WebVitalsMetrics } from './types';

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput?: boolean;
  value?: number;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class WebVitalsMonitor {
  private metrics: WebVitalsMetrics = {
    lcp: null,
    cls: null,
    inp: null,
    domContentLoaded: null,
    loadTime: null,
  };

  private isInitialized = false;

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }
    this.isInitialized = true;

    // Сбор LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.lcp = Math.round(lastEntry.startTime);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Игнорируем отсутствие поддержки LCP
    }

    // Сбор CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const shiftEntry = entry as LayoutShiftEntry;
          if (!shiftEntry.hadRecentInput) {
            clsValue += shiftEntry.value || 0;
            this.metrics.cls = Math.round(clsValue * 1000) / 1000;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // Игнорируем отсутствие поддержки CLS
    }

    // Сбор времени загрузки DOM и Window
    if (typeof window.performance !== 'undefined' && window.performance.timing) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = window.performance.timing;
          if (timing.domContentLoadedEventEnd && timing.navigationStart) {
            this.metrics.domContentLoaded = Math.max(
              0,
              timing.domContentLoadedEventEnd - timing.navigationStart,
            );
          }
          if (timing.loadEventEnd && timing.navigationStart) {
            this.metrics.loadTime = Math.max(0, timing.loadEventEnd - timing.navigationStart);
          }
        }, 0);
      });
    }
  }

  public getMetrics(): WebVitalsMetrics {
    const memory = this.getMemoryMetrics();
    return {
      ...this.metrics,
      memory,
    };
  }

  private getMemoryMetrics(): WebVitalsMetrics['memory'] | undefined {
    if (typeof performance === 'undefined') return undefined;

    const perfWithMemory = performance as unknown as { memory?: PerformanceMemory };
    const perfMem = perfWithMemory.memory;
    if (perfMem && typeof perfMem.usedJSHeapSize === 'number') {
      return {
        usedJSHeapSizeMb: Math.round((perfMem.usedJSHeapSize / (1024 * 1024)) * 10) / 10,
        totalJSHeapSizeMb: Math.round((perfMem.totalJSHeapSize / (1024 * 1024)) * 10) / 10,
        jsHeapSizeLimitMb: Math.round((perfMem.jsHeapSizeLimit / (1024 * 1024)) * 10) / 10,
      };
    }
    return undefined;
  }
}

export const webVitals = new WebVitalsMonitor();
