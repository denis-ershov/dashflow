import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  resilientFetch,
  CircuitBreakerOpenError,
  NetworkOfflineError,
} from '@/core/network/resilientFetch';
import { getCircuitBreaker } from '@/core/network/circuitBreaker';

describe('Network: resilientFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('должен успешно возвращать результат при первом успешном запросе', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const res = await resilientFetch('https://api.example.com/data', {
      timeoutMs: 1000,
      retries: 1,
    });

    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('должен выбрасывать NetworkOfflineError при отсутствии сети', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await expect(
      resilientFetch('https://api.example.com/data', { silent: true }),
    ).rejects.toThrow(NetworkOfflineError);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('должен повторять запрос при ошибках сервера 500', async () => {
    const errorResponse = new Response('Server Error', { status: 500, statusText: 'Internal Error' });
    const successResponse = new Response('OK', { status: 200 });

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(successResponse);

    const res = await resilientFetch('https://api.example.com/retry-test', {
      timeoutMs: 1000,
      retries: 2,
      baseDelayMs: 10,
      silent: true,
    });

    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('должен выбрасывать CircuitBreakerOpenError если цепь разомкнута', async () => {
    const breaker = getCircuitBreaker('failing-service', { failureThreshold: 1 });
    breaker.recordFailure();

    await expect(
      resilientFetch('https://api.example.com/fail', {
        circuitBreakerName: 'failing-service',
        silent: true,
      }),
    ).rejects.toThrow(CircuitBreakerOpenError);
  });
});
