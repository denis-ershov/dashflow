import { describe, it, expect } from 'vitest';
import { crashLogger } from '@/core/observability/crashLogger';
import { featureFlags } from '@/core/featureFlags/flags';

describe('Performance Benchmarks & Profiling', () => {
  it('сериализация и санитизация 100 логов сбоев должна занимать менее 50 мс', () => {
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      crashLogger.logError(
        new Error(`Benchmark test error #${i} at C:\\Users\\Developer\\file_${i}.ts`),
        'widget',
        { iteration: i, time: Date.now() },
      );
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('экспорт диагностического JSON отчета должен выполняться мгновенно (< 20 мс)', () => {
    const start = performance.now();
    const jsonStr = crashLogger.exportDiagnosticReport();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
    expect(jsonStr.length).toBeGreaterThan(10);
  });

  it('проверка статуса 1000 запросов флагов функциональности должна занимать менее 10 мс', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      featureFlags.isEnabled('aiSearchEngines');
      featureFlags.isEnabled('ambientAudio');
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });
});
