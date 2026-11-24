import { asRecord } from '@/core/network/jsonReaders';
import { parseStoredItem } from '@/core/items/validation';
import {
  HUB_API_VERSION,
  parseHubChangePage,
  parseHubSyncSnapshot,
  type HubPushChange,
} from '../../../packages/shared/src/sync';
import { isHubToken, type HubConnection, type HubFailure } from './model';
import { readHubAgent, readHubAgentPreview, readHubAgentRollback } from './agents';
import {
  INTEGRATION_IDS,
  readHubCalendar,
  readIntegrationStatus,
  type IntegrationId,
} from './integrations';

export class HubClientError extends Error {
  constructor(readonly issue: HubFailure) {
    super(issue);
  }
}

const REQUEST_TIMEOUT_MS = 12_000;
const PULL_LIMIT = 10;

export function hubUrl(origin: string, path: string): URL {
  return new URL(`/${HUB_API_VERSION}/${path}`, origin);
}

async function requestHub(url: URL, token?: string, payload?: string): Promise<unknown> {
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (payload !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(url, {
      method: payload === undefined ? 'GET' : 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    throw new HubClientError('network');
  }
  if (response.status === 401 || response.status === 403) {
    throw new HubClientError(token ? 'unauthorized' : 'pairing');
  }
  if (response.status === 413) throw new HubClientError('size');
  if (response.status === 429 || response.status >= 500) throw new HubClientError('network');
  if (!response.ok) throw new HubClientError('data');
  try {
    const value: unknown = await response.json();
    return value;
  } catch {
    throw new HubClientError('data');
  }
}

export async function redeemHubCode(origin: string, code: string): Promise<string> {
  const value = asRecord(
    await requestHub(hubUrl(origin, 'pair'), undefined, JSON.stringify({ code, name: 'DashFlow' })),
  );
  if (!isHubToken(value.token)) throw new HubClientError('data');
  return value.token;
}

export async function pullHubChanges(connection: HubConnection, since: number) {
  const url = hubUrl(connection.origin, 'changes');
  url.searchParams.set('since', String(since));
  url.searchParams.set('limit', String(PULL_LIMIT));
  return parseHubChangePage(await requestHub(url, connection.token), since, PULL_LIMIT);
}

export async function getHubEarlierItem(connection: HubConnection, id: string) {
  const url = hubUrl(connection.origin, `items/${encodeURIComponent(id)}/history`);
  url.searchParams.set('limit', '10');
  const { history } = asRecord(await requestHub(url, connection.token));
  if (!Array.isArray(history)) throw new HubClientError('data');
  for (const row of history) {
    const { value } = asRecord(row);
    if (value === null) continue;
    const item = parseStoredItem(value);
    if (item.id === id) return item;
  }
  return undefined;
}

export async function fetchHubAgents(connection: HubConnection) {
  const { agents } = asRecord(
    await requestHub(hubUrl(connection.origin, 'agents'), connection.token),
  );
  if (!Array.isArray(agents)) throw new HubClientError('data');
  return agents.map(readHubAgent);
}

export async function fetchHubIntegrations(connection: HubConnection) {
  const raw = await requestHub(hubUrl(connection.origin, 'integrations'), connection.token);
  const { integrations } = asRecord(raw);
  if (!Array.isArray(integrations) || integrations.length > INTEGRATION_IDS.length) {
    throw new HubClientError('data');
  }
  return integrations.map(readIntegrationStatus);
}

export async function pollHubIntegration(connection: HubConnection, id: IntegrationId) {
  await requestHub(hubUrl(connection.origin, `integrations/${id}/poll`), connection.token, '{}');
}

export async function fetchHubCalendar(connection: HubConnection) {
  const raw = await requestHub(hubUrl(connection.origin, 'calendar/agenda'), connection.token);
  return readHubCalendar(asRecord(raw).snapshot);
}

export async function revokeHubAgent(connection: HubConnection, id: string) {
  const url = hubUrl(connection.origin, `agents/${encodeURIComponent(id)}/revoke`);
  const { agent } = asRecord(await requestHub(url, connection.token, '{}'));
  return readHubAgent(agent);
}

export async function previewHubAgentRollback(
  connection: HubConnection,
  id: string,
  since: string,
  until?: string,
) {
  const url = hubUrl(connection.origin, `agents/${encodeURIComponent(id)}/rollback/preview`);
  const { preview } = asRecord(
    await requestHub(url, connection.token, JSON.stringify({ since, until })),
  );
  return readHubAgentPreview(preview);
}

export async function rollbackHubAgent(
  connection: HubConnection,
  id: string,
  since: string,
  until: string,
  previewToken: string,
) {
  const url = hubUrl(connection.origin, `agents/${encodeURIComponent(id)}/rollback`);
  const { result } = asRecord(
    await requestHub(url, connection.token, JSON.stringify({ since, until, previewToken })),
  );
  return readHubAgentRollback(result);
}

export async function pushHubChanges(connection: HubConnection, changes: readonly HubPushChange[]) {
  const { results } = asRecord(
    await requestHub(
      hubUrl(connection.origin, 'sync/push'),
      connection.token,
      JSON.stringify({ changes }),
    ),
  );
  if (!Array.isArray(results) || results.length !== changes.length)
    throw new HubClientError('data');
  return changes.map(({ entity, id, idempotencyKey, version }, index): HubPushChange => {
    const result = asRecord(results[index]);
    if (
      result.idempotencyKey !== idempotencyKey ||
      typeof result.applied !== 'boolean' ||
      typeof result.version !== 'number' ||
      result.version < version
    ) {
      throw new HubClientError('data');
    }
    return {
      ...parseHubSyncSnapshot({
        entity,
        id,
        version: result.version,
        op: result.value === null ? 'delete' : 'upsert',
        value: result.value,
      }),
      idempotencyKey,
    };
  });
}
