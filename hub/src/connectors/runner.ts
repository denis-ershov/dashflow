import { createHash } from 'node:crypto';
import { HubDbError, type HubRepository } from '../db/index.js';
import { ConnectorError, type ConnectorItem, type PollingConnector } from './contract.js';
import {
  loadConnectorStatus,
  saveConnectorStatus,
  type PersistedConnectorStatus,
} from './state.js';

const DEFAULT_INTERVAL_MS = 300_000;
const MAX_INTERVAL_MS = 86_400_000;
const MAX_TIMER_MS = 2_147_483_647;
const POLL_TIMEOUT_MS = 180_000;
const RECENT_ID_LIMIT = 4_000;

interface ConnectorRunnerOptions {
  connector: PollingConnector;
  repository: HubRepository;
  statePath: string;
  intervalMs?: number;
  onChanges?: () => void;
}

export type ConnectorStatus = Omit<PersistedConnectorStatus, 'state'> & {
  id: string;
  state: PersistedConnectorStatus['state'] | 'polling';
  nextPollAt: string | null;
};

function ingest(
  repository: HubRepository,
  connector: PollingConnector,
  { externalId, draft }: ConnectorItem,
) {
  if (typeof externalId !== 'string' || externalId.length < 1 || externalId.length > 512)
    throw new ConnectorError('INVALID_RESPONSE');
  if (draft.boardId) {
    const board = repository.getBoard(draft.boardId);
    if (!board || board.archivedAt || !board.columns.some(({ id }) => id === draft.status))
      throw new ConnectorError('CONFIGURATION');
  }
  const key = createHash('sha256').update(externalId).digest('hex');
  try {
    repository.createItem(
      { id: connector.id, name: connector.name, type: 'connector' },
      draft,
      key,
    );
  } catch (error) {
    if (!(
      error instanceof HubDbError &&
      error.code === 'CONFLICT' &&
      error.message === 'Idempotency key has already been used'
    ))
      throw error;
  }
}

export function createConnectorRunner({
  connector,
  repository,
  statePath,
  intervalMs = DEFAULT_INTERVAL_MS,
  onChanges,
}: ConnectorRunnerOptions) {
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 60_000 || intervalMs > MAX_INTERVAL_MS)
    throw new ConnectorError('CONFIGURATION');

  let stored: PersistedConnectorStatus = {
    state: 'idle',
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    retryAt: null,
  };
  const seen = new Set<string>();
  let ready = false;
  let starting: Promise<void> | undefined;
  let stopped = false;
  let nextPollAt: number | undefined;
  let running: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = new AbortController();
  const retryTimestamp = () => (stored.retryAt ? Date.parse(stored.retryAt) : 0);
  const iso = (value: number) => new Date(value).toISOString();

  function status(): ConnectorStatus {
    return {
      ...stored,
      id: connector.id,
      state: running ? 'polling' : stored.state,
      nextPollAt: nextPollAt === undefined ? null : iso(nextPollAt),
    };
  }

  function schedule(at: number) {
    clearTimeout(timer);
    if (stopped) return;
    nextPollAt = at;
    timer = setTimeout(
      () => {
        if (Date.now() < at) schedule(at);
        else void pollNow();
      },
      Math.max(0, Math.min(MAX_TIMER_MS, at - Date.now())),
    );
    timer.unref();
  }

  async function run() {
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(POLL_TIMEOUT_MS)]);
    stored.lastAttemptAt = iso(Date.now());
    let changed = false;
    try {
      const result = await connector.poll({ signal });
      signal.throwIfAborted();
      const startSequence = repository.latestChangeSeq();
      try {
        for (const item of result.items) {
          if (seen.has(item.externalId)) continue;
          ingest(repository, connector, item);
          seen.add(item.externalId);
          const oldest = seen.values().next().value;
          if (seen.size > RECENT_ID_LIMIT && oldest !== undefined) seen.delete(oldest);
        }
      } finally {
        changed = repository.latestChangeSeq() > startSequence;
      }
      if (result.incomplete) throw new ConnectorError('INCOMPLETE');
      stored = {
        ...stored,
        state: 'ok',
        lastSuccessAt: iso(Date.now()),
        lastError: null,
        retryAt: null,
      };
    } catch (error) {
      if (stopped) return;
      const safe =
        error instanceof ConnectorError
          ? error
          : new ConnectorError(signal.aborted ? 'UNAVAILABLE' : 'STORAGE');
      const retry = safe.retryAt;
      stored = {
        ...stored,
        state: 'error',
        lastError: safe.code,
        retryAt:
          retry !== undefined &&
          Number.isSafeInteger(retry) &&
          retry > Date.now() &&
          retry <= 8_640_000_000_000_000
            ? iso(retry)
            : null,
      };
    }
    if (changed) {
      try {
        onChanges?.();
      } catch {
        stored = { ...stored, state: 'error', lastError: 'STORAGE' };
      }
    }
    try {
      await saveConnectorStatus(statePath, stored);
    } catch {
      stored = { ...stored, state: 'error', lastError: 'STORAGE' };
    }
  }

  async function pollNow() {
    if (!ready || stopped || Date.now() < retryTimestamp()) return status();
    if (!running) {
      clearTimeout(timer);
      nextPollAt = undefined;
      running = run().finally(() => {
        running = undefined;
        schedule(Math.max(Date.now() + intervalMs, retryTimestamp()));
      });
    }
    await running;
    return status();
  }

  return {
    status,
    pollNow,
    start() {
      if (stopped) return Promise.resolve();
      starting ??= (async () => {
        try {
          stored = (await loadConnectorStatus(statePath)) ?? stored;
        } catch {
          stored = { ...stored, state: 'error', lastError: 'STORAGE' };
        }
        const attempted = stored.lastAttemptAt ? Date.parse(stored.lastAttemptAt) + intervalMs : 0;
        ready = true;
        schedule(Math.max(Date.now(), attempted, retryTimestamp()));
      })();
      return starting;
    },
    async stop() {
      stopped = true;
      clearTimeout(timer);
      nextPollAt = undefined;
      abort.abort();
      await starting;
      await running;
    },
  };
}
