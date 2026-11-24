import { createHmac, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { HubDbError, type AgentRollbackRange, type Entity } from './types.js';

const ROLLBACK_LIMIT = 100;

export interface RollbackStep {
  entity: Entity;
  id: string;
  seq: number;
  preceding_seq: number | null;
  before_payload: string | null;
  before_deleted: 0 | 1;
}

function isoDate(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    throw new HubDbError('VALIDATION_FAILED', 'Invalid rollback period');
  }
  return new Date(time).toISOString();
}

export function planAgentRollback(
  db: DatabaseSync,
  agentId: string,
  range: AgentRollbackRange,
  now: Date,
) {
  const since = isoDate(range.since);
  const until = range.until === undefined ? now.toISOString() : isoDate(range.until);
  if (since > until || until > now.toISOString()) {
    throw new HubDbError('VALIDATION_FAILED', 'Invalid rollback period');
  }
  const rows = db
    .prepare(
      `
    SELECT c.seq, c.entity, c.id, c.before_payload, c.before_deleted,
      (SELECT max(p.seq) FROM changes p WHERE p.entity = c.entity AND p.id = c.id AND p.seq < c.seq) AS preceding_seq
    FROM changes c WHERE c.actor_id = ? AND c.at >= ? AND c.at <= ? ORDER BY c.at DESC, c.seq DESC LIMIT ?
  `,
    )
    .all(agentId, since, until, ROLLBACK_LIMIT + 1) as unknown as RollbackStep[];
  if (rows.length > ROLLBACK_LIMIT) {
    throw new HubDbError('VALIDATION_FAILED', 'Rollback period exceeds 100 operations');
  }
  const groups = groupByEntity(rows.sort((left, right) => right.seq - left.seq));
  const latest = db.prepare('SELECT max(seq) AS seq FROM changes WHERE entity = ? AND id = ?');
  const plan = [...groups.values()].map((group) => {
    const first = group[0];
    const latestSeq = Number(latest.get(first.entity, first.id)?.seq);
    return { latestSeq, ...eligibleForEntity(db, group, latestSeq) };
  });
  return {
    since,
    until,
    matched: rows.length,
    eligible: plan.reduce((count, entry) => count + entry.steps, 0),
    plan,
  };
}

function groupByEntity(rows: RollbackStep[]): Map<string, [RollbackStep, ...RollbackStep[]]> {
  const groups = new Map<string, [RollbackStep, ...RollbackStep[]]>();
  for (const row of rows) {
    const key = `${row.entity}:${row.id}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

function eligibleForEntity(db: DatabaseSync, group: RollbackStep[], latestSeq: number) {
  let expected: number | null = latestSeq;
  let earliest: RollbackStep | undefined;
  let steps = 0;
  for (const row of group) {
    if (row.seq !== expected) break;
    // Снятие созданной доски не должно оставлять пользовательские задачи без доски.
    if (
      row.entity === 'board' &&
      (row.before_payload === null || row.before_deleted === 1) &&
      db
        .prepare('SELECT 1 FROM items WHERE board_id = ? AND deleted_at IS NULL LIMIT 1')
        .get(row.id)
    )
      break;
    earliest = row;
    expected = row.preceding_seq;
    steps++;
  }
  return { earliest, steps };
}

export function signRollback(
  secret: Buffer,
  actorId: string,
  agentId: string,
  plan: ReturnType<typeof planAgentRollback>,
): string {
  const { since, until, matched, eligible } = plan;
  return createHmac('sha256', secret)
    .update(
      JSON.stringify([
        actorId,
        agentId,
        since,
        until,
        matched,
        eligible,
        plan.plan.map(({ latestSeq, earliest, steps }) => [latestSeq, earliest?.seq, steps]),
      ]),
    )
    .digest('hex');
}

export function assertRollbackSignature(expected: string, actual: string): void {
  if (
    !/^[0-9a-f]{64}$/.test(actual) ||
    !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))
  ) {
    throw new HubDbError('CONFLICT', 'Rollback preview is stale');
  }
}
