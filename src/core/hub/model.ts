import { asRecord } from '@/core/network/jsonReaders';

export { HUB_DEFAULT_ORIGIN } from '../../../packages/shared/src/sync';
export const HUB_CONNECTION_KEY = 'dashflow:hub-connection';
export const HUB_STATUS_KEY = 'dashflow:hub-status';
export const HUB_TAB = 'dashflow:hub-tab';
export const HUB_PAIR = 'dashflow:hub-pair';
export const HUB_DISCONNECT = 'dashflow:hub-disconnect';
export const HUB_RETRY = 'dashflow:hub-retry';
export const HUB_HISTORY = 'dashflow:hub-history';

export type HubState = 'disconnected' | 'connecting' | 'connected' | 'offline' | 'error';
export type HubFailure =
  'address' | 'permissions' | 'pairing' | 'unauthorized' | 'network' | 'data' | 'size';
export interface HubStatus {
  state: HubState;
  origin?: string;
  issue?: HubFailure;
  lastSync?: number;
  retryAt?: number;
}

export interface HubConnection {
  id: string;
  origin: string;
  token: string;
}

export const HUB_DISCONNECTED: HubStatus = { state: 'disconnected' };

export function normalizeHubOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2_048) return;
  try {
    const url = new URL(value.trim());
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) return;
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return;
    return url.origin;
  } catch {
    return;
  }
}

export function isHubToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function readHubConnection(value: unknown): HubConnection | undefined {
  const { id, origin, token } = asRecord(value);
  const normalized = normalizeHubOrigin(origin);
  if (typeof id === 'string' && normalized && isHubToken(token)) {
    return { id, origin: normalized, token };
  }
  return undefined;
}

export function readHubStatus(value: unknown): HubStatus {
  const { state, origin, issue, lastSync, retryAt } = asRecord(value);
  if (state !== 'connecting' && state !== 'connected' && state !== 'offline' && state !== 'error') {
    return HUB_DISCONNECTED;
  }
  const result: HubStatus = { state, origin: normalizeHubOrigin(origin) };
  if (typeof lastSync === 'number' && Number.isFinite(lastSync)) result.lastSync = lastSync;
  if (typeof retryAt === 'number' && Number.isFinite(retryAt)) result.retryAt = retryAt;
  if (
    issue === 'address' ||
    issue === 'permissions' ||
    issue === 'pairing' ||
    issue === 'unauthorized' ||
    issue === 'network' ||
    issue === 'data' ||
    issue === 'size'
  )
    result.issue = issue;
  return result;
}
