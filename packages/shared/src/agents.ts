export interface HubAgentRecord {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdItems: number;
}

export interface HubAgentRollbackPreview {
  since: string;
  until: string;
  matched: number;
  eligible: number;
  skipped: number;
  previewToken: string;
}

export interface HubAgentRollbackResult {
  reverted: number;
  skipped: number;
  latestSeq: number;
}
