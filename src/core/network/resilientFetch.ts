import { crashLogger } from '@/core/observability';
import { getCircuitBreaker } from './circuitBreaker';

export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  circuitBreakerName?: string;
  silent?: boolean;
}

export class CircuitBreakerOpenError extends Error {
  constructor(serviceName: string) {
    super(`Сервис "${serviceName}" временно недоступен (активирована защита Circuit Breaker)`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class NetworkOfflineError extends Error {
  constructor() {
    super('Отсутствует сетевое подключение');
    this.name = 'NetworkOfflineError';
  }
}

/**
 * Отправляет HTTP-запрос с автоматическими повторами (exponential backoff + jitter),
 * защитой по таймауту и предохранителем Circuit Breaker.
 */
export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 8000,
    retries = 2,
    baseDelayMs = 800,
    circuitBreakerName,
    silent = false,
    ...fetchOptions
  } = options;

  // 1. Проверка доступности сети
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new NetworkOfflineError();
  }

  // 2. Проверка Circuit Breaker
  const breaker = circuitBreakerName ? getCircuitBreaker(circuitBreakerName) : null;
  if (breaker && !breaker.canExecute()) {
    throw new CircuitBreakerOpenError(breaker.name);
  }

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Серверные ошибки 5xx считаем поводом для retry и сбоя брейкера
      if (response.status >= 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Успешный запрос
      breaker?.recordSuccess();
      return response;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = err;

      // Если запрос был отменен намеренно пользователем
      if (err instanceof DOMException && err.name === 'AbortError' && options.signal?.aborted) {
        throw err;
      }

      attempt++;

      if (attempt <= retries) {
        // Экспоненциальный откат с рандомизацией (Full Jitter)
        const delay = Math.min(5000, baseDelayMs * Math.pow(2, attempt - 1));
        const jitter = Math.random() * delay * 0.3;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }
  }

  // Все попытки исчерпаны
  breaker?.recordFailure();

  if (!silent) {
    crashLogger.logWarning(
      `Сетевой сбой при запросе к ${url.split('?')[0]}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      'network',
      {
        url: url.split('?')[0],
        retries,
        circuitBreaker: circuitBreakerName || 'none',
      },
    );
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
