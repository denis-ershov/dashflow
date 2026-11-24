import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { ulid } from '@dashflow/shared';
import { transaction } from './schema.js';
import { HubDbError, type AuditEntry, type TokenRecord } from './types.js';

const PAIR_TTL_MS = 5 * 60 * 1000;
const PAIR_MAX_FAILURES = 10;
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');

function validateName(name: string): string {
  if (typeof name !== 'string' || !name.trim() || name.length > 100) {
    throw new HubDbError('VALIDATION_FAILED', 'Invalid credential name');
  }
  return name.trim();
}

interface TokenRow {
  id: string;
  name: string;
  scopes: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
}

function readToken(row: TokenRow): TokenRecord {
  return {
    id: row.id,
    name: row.name,
    scopes: JSON.parse(row.scopes) as string[],
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    lastUsedAt: row.last_used_at ?? undefined,
  };
}

export class Credentials {
  constructor(
    protected readonly db: DatabaseSync,
    protected readonly now: () => Date,
  ) {}

  recordAudit(entry: AuditEntry): void {
    this.db
      .prepare('INSERT INTO audit(actor_id, action, entity_id, outcome, at) VALUES (?,?,?,?,?)')
      .run(
        entry.actorId,
        entry.action,
        entry.entityId ?? null,
        entry.outcome,
        this.now().toISOString(),
      );
  }

  private issueToken(name: string, scopes: readonly string[], expiresAt?: string) {
    const now = this.now();
    const expiresMs = expiresAt === undefined ? undefined : Date.parse(expiresAt);
    if (expiresMs !== undefined && (!Number.isFinite(expiresMs) || expiresMs <= now.getTime())) {
      throw new HubDbError('VALIDATION_FAILED', 'Token expiry must be in the future');
    }
    if (
      !Array.isArray(scopes) ||
      !scopes.length ||
      scopes.length > 20 ||
      !scopes.every(
        (scope: unknown): scope is string =>
          typeof scope === 'string' && scope.length <= 40 && /^[a-z]+(?::[a-z]+)?$/.test(scope),
      )
    ) {
      throw new HubDbError('VALIDATION_FAILED', 'Invalid token scopes');
    }
    const token = secret();
    const record: TokenRecord = {
      id: ulid(now.getTime()),
      name: validateName(name),
      scopes: [...new Set<string>(scopes)],
      createdAt: now.toISOString(),
      expiresAt: expiresMs === undefined ? undefined : new Date(expiresMs).toISOString(),
    };
    this.db
      .prepare('INSERT INTO tokens(id,hash,name,scopes,created_at,expires_at) VALUES (?,?,?,?,?,?)')
      .run(
        record.id,
        digest(token),
        record.name,
        JSON.stringify(record.scopes),
        record.createdAt,
        record.expiresAt ?? null,
      );
    return { token, record };
  }

  createToken(name: string, scopes: readonly string[], expiresAt?: string) {
    return transaction(this.db, () => {
      const result = this.issueToken(name, scopes, expiresAt);
      this.recordAudit({
        actorId: 'admin',
        action: 'token.create',
        entityId: result.record.id,
        outcome: 'ok',
      });
      return result;
    });
  }

  authenticateToken(token: string): TokenRecord | undefined {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return;
    const now = this.now().toISOString();
    const row = this.db
      .prepare(
        `UPDATE tokens SET last_used_at = ?
      WHERE hash = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)
      RETURNING id,name,scopes,created_at,expires_at,revoked_at,last_used_at`,
      )
      .get(now, digest(token), now) as TokenRow | undefined;
    return row && readToken(row);
  }

  isTokenActive(id: string): boolean {
    return Boolean(
      this.db
        .prepare(
          `SELECT 1 FROM tokens WHERE id = ? AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > ?)`,
        )
        .get(id, this.now().toISOString()),
    );
  }

  protected getTokenRecord(id: string): TokenRecord | undefined {
    const row = this.db
      .prepare(
        'SELECT id,name,scopes,created_at,expires_at,revoked_at,last_used_at FROM tokens WHERE id = ?',
      )
      .get(id) as TokenRow | undefined;
    return row && readToken(row);
  }

  listTokens(): TokenRecord[] {
    return (
      this.db
        .prepare(
          'SELECT id,name,scopes,created_at,expires_at,revoked_at,last_used_at FROM tokens ORDER BY id',
        )
        .all() as unknown as TokenRow[]
    ).map(readToken);
  }

  revokeToken(id: string): boolean {
    return transaction(this.db, () => {
      if (!this.markTokenRevoked(id)) return false;
      this.recordAudit({ actorId: 'admin', action: 'token.revoke', entityId: id, outcome: 'ok' });
      return true;
    });
  }

  protected markTokenRevoked(id: string): boolean {
    return Boolean(
      this.db
        .prepare('UPDATE tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
        .run(this.now().toISOString(), id).changes,
    );
  }

  createPairingChallenge(origin?: string) {
    if (origin !== undefined && !/^(?:chrome|moz)-extension:\/\/[a-z0-9-]+$/.test(origin)) {
      throw new HubDbError('VALIDATION_FAILED', 'Invalid pairing origin');
    }
    const code = randomInt(1_000_000).toString().padStart(6, '0');
    const salt = secret();
    const expiresAt = new Date(this.now().getTime() + PAIR_TTL_MS).toISOString();
    const hash = scryptSync(code, salt, 32).toString('hex');
    return transaction(this.db, () => {
      this.db
        .prepare('INSERT OR REPLACE INTO pairing_challenges VALUES (1,?,?,?,?,0)')
        .run(hash, salt, origin ?? null, expiresAt);
      this.recordAudit({ actorId: 'admin', action: 'pair.create', outcome: 'ok' });
      return { code, expiresAt };
    });
  }

  consumePairingChallenge(code: string, deviceName: string, origin?: string) {
    if (!/^\d{6}$/.test(code)) return;
    return transaction(this.db, () => {
      const challenge = this.db
        .prepare('SELECT * FROM pairing_challenges WHERE singleton = 1')
        .get() as
        | {
            hash: string;
            salt: string;
            expires_at: string;
            origin: string | null;
            failed_attempts: number;
          }
        | undefined;
      if (
        !challenge ||
        challenge.expires_at <= this.now().toISOString() ||
        challenge.failed_attempts >= PAIR_MAX_FAILURES ||
        (challenge.origin && challenge.origin !== origin)
      )
        return;
      if (
        !timingSafeEqual(scryptSync(code, challenge.salt, 32), Buffer.from(challenge.hash, 'hex'))
      ) {
        this.db.exec(
          'UPDATE pairing_challenges SET failed_attempts = failed_attempts + 1 WHERE singleton = 1',
        );
        return;
      }
      const result = this.issueToken(deviceName, ['sync']);
      this.db.exec('DELETE FROM pairing_challenges WHERE singleton = 1');
      this.recordAudit({ actorId: result.record.id, action: 'pair.consume', outcome: 'ok' });
      return result;
    });
  }

  createWebhook(name: string) {
    const token = secret();
    const key = secret();
    const now = this.now();
    const record = {
      id: ulid(now.getTime()),
      name: validateName(name),
      createdAt: now.toISOString(),
    };
    return transaction(this.db, () => {
      this.db
        .prepare('INSERT INTO webhooks(id,hash,signing_key,name,created_at) VALUES (?,?,?,?,?)')
        .run(record.id, digest(token), key, record.name, record.createdAt);
      this.recordAudit({
        actorId: 'admin',
        action: 'webhook.create',
        entityId: record.id,
        outcome: 'ok',
      });
      return { token, secret: key, record };
    });
  }

  listWebhooks(): { id: string; name: string; createdAt: string; revokedAt?: string }[] {
    const rows = this.db
      .prepare('SELECT id,name,created_at,revoked_at FROM webhooks ORDER BY id')
      .all() as unknown as {
      id: string;
      name: string;
      created_at: string;
      revoked_at: string | null;
    }[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      revokedAt: row.revoked_at ?? undefined,
    }));
  }

  getWebhook(token: string): { id: string; name: string; key: string } | undefined {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return;
    return this.db
      .prepare(
        'SELECT id,name,signing_key AS key FROM webhooks WHERE hash = ? AND revoked_at IS NULL',
      )
      .get(digest(token)) as { id: string; name: string; key: string } | undefined;
  }

  revokeWebhook(id: string): boolean {
    return transaction(this.db, () => {
      const result = this.db
        .prepare(
          `UPDATE webhooks SET revoked_at = ?, signing_key = ''
        WHERE id = ? AND revoked_at IS NULL`,
        )
        .run(this.now().toISOString(), id);
      if (!result.changes) return false;
      this.recordAudit({ actorId: 'admin', action: 'webhook.revoke', entityId: id, outcome: 'ok' });
      return true;
    });
  }
}
