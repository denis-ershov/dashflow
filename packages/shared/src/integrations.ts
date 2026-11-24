import { asRecord } from './jsonReaders.js';

export const INTEGRATION_IDS = ['github', 'telegram', 'calendar', 'mail'] as const;
export type IntegrationId = (typeof INTEGRATION_IDS)[number];
const states = ['disabled', 'idle', 'polling', 'ok', 'error'] as const;
const errors = [
  'CONFIGURATION',
  'UNAUTHORIZED',
  'RATE_LIMITED',
  'UNAVAILABLE',
  'INVALID_RESPONSE',
  'INCOMPLETE',
  'STORAGE',
] as const;

export function readIntegrationStatus(value: unknown) {
  const input = asRecord(value);
  const id = INTEGRATION_IDS.find((candidate) => candidate === input.id);
  const state = states.find((candidate) => candidate === input.state);
  if (!id || !state) throw new Error('INVALID_INTEGRATION_STATUS');
  const lastError = errors.find((candidate) => candidate === input.lastError) ?? null;
  const readTime = (value: unknown) => {
    if (value === null) return null;
    if (typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))) {
      return value;
    }
    throw new Error('INVALID_INTEGRATION_TIMESTAMP');
  };
  return {
    id,
    state,
    lastError,
    lastAttemptAt: readTime(input.lastAttemptAt),
    lastSuccessAt: readTime(input.lastSuccessAt),
    retryAt: readTime(input.retryAt),
    nextPollAt: readTime(input.nextPollAt),
  };
}

export type HubIntegrationStatus = ReturnType<typeof readIntegrationStatus>;
