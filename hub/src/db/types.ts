import type { HubPushResult, ItemKind, ItemSource } from '@dashflow/shared';

export type { HubChange } from '@dashflow/shared';

export type Actor = ItemSource & { scopes?: readonly string[] };
export type Entity = 'item' | 'board';
export type ChangeOperation = 'upsert' | 'delete';

export interface PushChange {
  entity: Entity;
  op: ChangeOperation;
  id: string;
  value: unknown;
  version: number;
  idempotencyKey: string;
}

export type PushResult = HubPushResult;

export interface TokenRecord {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
}

export interface AuditEntry {
  actorId: string;
  action: string;
  entityId?: string;
  outcome: string;
}

export interface ListItemsQuery {
  kind?: ItemKind;
  status?: string;
  boardId?: string;
  q?: string;
  cursor?: string;
  limit?: number;
  includeDeleted?: boolean;
  includeArchived?: boolean;
  tag?: string;
}

export class HubDbError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN' | 'VALIDATION_FAILED',
    message: string,
    public readonly details?: { version: number },
  ) {
    super(message);
    this.name = 'HubDbError';
  }
}
