import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, getCircuitBreaker } from '@/core/network/circuitBreaker';

describe('Network: CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      resetTimeoutMs: 5000,
    });
  });

  it('должен начинать в состоянии CLOSED и разрешать выполнение', () => {
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);
  });

  it('должен размыкать цепь (OPEN) после достижения порога сбоев', () => {
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);

    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);

    breaker.recordFailure(); // 3-й сбой подряд
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);
  });

  it('должен сбрасывать счетчик сбоев при успехе', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();

    expect(breaker.getState()).toBe('CLOSED');
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED'); // счетчик начался заново
  });

  it('должен переходить в HALF_OPEN по истечении таймаута сброса', () => {
    vi.useFakeTimers();

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);

    // Перематываем время на 5000 мс вперед
    vi.advanceTimersByTime(5000);

    expect(breaker.getState()).toBe('HALF_OPEN');
    expect(breaker.canExecute()).toBe(true);

    // Если пробный запрос успешен -> цепь замыкается
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');

    vi.useRealTimers();
  });

  it('должен повторно размыкать цепь при неудаче в HALF_OPEN', () => {
    vi.useFakeTimers();

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    vi.advanceTimersByTime(5000);
    expect(breaker.getState()).toBe('HALF_OPEN');

    // Пробный запрос провалился
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);

    vi.useRealTimers();
  });

  it('должен возвращать один и тот же экземпляр через getCircuitBreaker', () => {
    const cb1 = getCircuitBreaker('weather-api');
    const cb2 = getCircuitBreaker('weather-api');
    expect(cb1).toBe(cb2);
  });
});
