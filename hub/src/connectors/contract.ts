import type { ItemDraft } from '@dashflow/shared';

export interface ConnectorItem {
  externalId: string;
  draft: ItemDraft;
}

export interface ConnectorPollResult {
  items: readonly ConnectorItem[];
  incomplete?: boolean;
}

export interface PollingConnector {
  id: string;
  name: string;
  configSchema: Readonly<Record<string, unknown>>;
  poll(context: { signal: AbortSignal }): Promise<ConnectorPollResult>;
}

export const connectorErrors = [
  'CONFIGURATION',
  'UNAUTHORIZED',
  'RATE_LIMITED',
  'UNAVAILABLE',
  'INVALID_RESPONSE',
  'INCOMPLETE',
  'STORAGE',
] as const;

export type ConnectorErrorCode = (typeof connectorErrors)[number];

export class ConnectorError extends Error {
  constructor(
    readonly code: ConnectorErrorCode,
    readonly retryAt?: number,
  ) {
    super(code);
  }
}
