/**
 * Реализация паттерна Circuit Breaker (Предохранитель сетевых вызовов)
 * Предотвращает каскадные сбои при деградации внешних API (Open-Meteo, Unsplash, Nominatim)
 * (Security & Reliability, Правила 23, 25, 31)
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Количество сбоев подряд для размыкания цепи
  resetTimeoutMs?: number; // Время нахождения в состоянии OPEN до пробного запроса
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttempt = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  public canExecute(): boolean {
    const currentState = this.getState();
    return currentState === 'CLOSED' || currentState === 'HALF_OPEN';
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
    }
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = 0;
  }
}

const breakersRegistry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let breaker = breakersRegistry.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, options);
    breakersRegistry.set(name, breaker);
  }
  return breaker;
}

export function getAllCircuitBreakers(): CircuitBreaker[] {
  return Array.from(breakersRegistry.values());
}
