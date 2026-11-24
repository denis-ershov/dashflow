import { asRecord } from '@/core/network/jsonReaders';
import type {
  HubAgentRecord,
  HubAgentRollbackPreview,
  HubAgentRollbackResult,
} from '../../../packages/shared/src/agents';

export type {
  HubAgentRecord,
  HubAgentRollbackPreview,
  HubAgentRollbackResult,
} from '../../../packages/shared/src/agents';
export type { HubFailure } from './model';

export const HUB_AGENTS = 'dashflow:hub-agents';
export const HUB_AGENT_REVOKE = 'dashflow:hub-agent-revoke';
export const HUB_AGENT_PREVIEW = 'dashflow:hub-agent-preview';
export const HUB_AGENT_ROLLBACK = 'dashflow:hub-agent-rollback';

export function isAgentId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function readText(value: unknown, limit: number): string {
  if (typeof value !== 'string' || !value || value.length > limit) {
    throw new Error('INVALID_AGENT_FIELD');
  }
  return value;
}

function readDate(value: unknown) {
  const date = readText(value, 40);
  if (Number.isNaN(Date.parse(date))) throw new Error('INVALID_AGENT_DATE');
  return date;
}

function optionalDate(value: unknown) {
  return value === undefined ? undefined : readDate(value);
}

function readCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('INVALID_AGENT_COUNT');
  }
  return value;
}

export function readHubAgent(value: unknown): HubAgentRecord {
  const { id, name, scopes, createdAt, expiresAt, revokedAt, lastUsedAt, createdItems } =
    asRecord(value);
  if (!isAgentId(id) || !Array.isArray(scopes) || scopes.length > 30) {
    throw new Error('INVALID_AGENT_RECORD');
  }
  return {
    id,
    name: readText(name, 100),
    scopes: scopes.map((scope: unknown) => readText(scope, 40)),
    createdAt: readDate(createdAt),
    expiresAt: optionalDate(expiresAt),
    revokedAt: optionalDate(revokedAt),
    lastUsedAt: optionalDate(lastUsedAt),
    createdItems: readCount(createdItems),
  };
}

export function readHubAgentPreview(value: unknown): HubAgentRollbackPreview {
  const { since, until, matched, eligible, skipped, previewToken } = asRecord(value);
  return {
    since: readDate(since),
    until: readDate(until),
    matched: readCount(matched),
    eligible: readCount(eligible),
    skipped: readCount(skipped),
    previewToken: readText(previewToken, 256),
  };
}

export function readHubAgentRollback(value: unknown): HubAgentRollbackResult {
  const { reverted, skipped, latestSeq } = asRecord(value);
  return {
    reverted: readCount(reverted),
    skipped: readCount(skipped),
    latestSeq: readCount(latestSeq),
  };
}
