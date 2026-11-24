import type { HubRepository } from '../db/index.js';
import { TelegramRateLimit, type createTelegramHttp } from './telegramHttp.js';
import type { TelegramState } from './telegramState.js';

const DAY_MS = 86_400_000;
const PAGE_SIZE = 100;
const PAGES_PER_POLL = 5;

interface ReminderDispatch {
  repository: HubRepository;
  state: TelegramState;
  http: ReturnType<typeof createTelegramHttp>;
  chatId: string;
  redact: (value: string) => string;
  signal: AbortSignal;
}

export async function dispatchTelegramReminder({
  repository,
  state,
  http,
  chatId,
  redact,
  signal,
}: ReminderDispatch) {
  const now = Date.now();
  state.prune(now - 7 * DAY_MS);
  let cursor = state.checkpoint().cursor;
  for (let page = 0; page < PAGES_PER_POLL; page++) {
    const { items, nextCursor } = repository.listItems({
      cursor: cursor ?? undefined,
      limit: PAGE_SIZE,
    });
    for (const item of items) {
      const at = item.remindAt === undefined ? NaN : Date.parse(item.remindAt);
      if (!Number.isFinite(at) || at > now || at < now - DAY_MS || item.status === 'done') continue;
      signal.throwIfAborted();
      if (!state.claim(item.id, at)) continue;
      try {
        await http.sendMessage(chatId, redact(item.title), signal);
      } catch (error) {
        state.settle(item.id, at, error instanceof TelegramRateLimit ? 'retry' : 'failed');
        throw error;
      }
      state.settle(item.id, at, 'sent');
      return;
    }
    state.recordCursor(nextCursor);
    if (nextCursor === null) return;
    cursor = nextCursor;
  }
}
