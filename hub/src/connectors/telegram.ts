import { createHash } from 'node:crypto';
import { ITEM_LIMITS } from '@dashflow/shared';
import { z } from 'zod';
import { HubDbError, type HubRepository } from '../db/index.js';
import { ConnectorError, type PollingConnector } from './contract.js';
import { createConnectorRunner } from './runner.js';
import { createTelegramHttp, MAX_UPDATES } from './telegramHttp.js';
import { dispatchTelegramReminder } from './telegramReminders.js';
import { openTelegramState } from './telegramState.js';

const RESET_OFFSET_AFTER_MS = 6 * 86_400_000;
const chatId = z
  .string()
  .regex(/^-?[1-9]\d{0,15}$/)
  .refine((value) => Math.abs(Number(value)) < 2 ** 52);
const publicSchema = z
  .object({
    allowedChatIds: z.array(chatId).min(1).max(100),
    reminderChatId: chatId.optional(),
  })
  .strict();
const configSchema = publicSchema.extend({
  token: z.string().regex(/^[1-9]\d{0,15}:[a-zA-Z0-9_-]{16,128}$/),
});

interface TelegramRunnerOptions {
  token: string;
  allowedChatIds: readonly string[];
  reminderChatId?: string;
  repository: HubRepository;
  statePath: string;
  intervalMs?: number;
  onChanges?: () => void;
}

function capture(
  repository: HubRepository,
  botId: string,
  chat: number,
  messageId: number,
  text: string,
) {
  const key = createHash('sha256').update(`${botId}:${chat}:${messageId}`).digest('hex');
  const title = text.slice(0, ITEM_LIMITS.titleLength).replace(/[\uD800-\uDBFF]$/u, '');
  try {
    repository.createItem(
      { id: 'telegram', name: 'Telegram', type: 'connector' },
      { kind: 'note', status: 'inbox', title, body: text },
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

export function createTelegramRunner(
  {
    token,
    allowedChatIds,
    reminderChatId,
    repository,
    statePath,
    intervalMs = 60_000,
    onChanges,
  }: TelegramRunnerOptions,
  fetcher: typeof fetch = fetch,
) {
  const config = configSchema.safeParse({ token, allowedChatIds, reminderChatId });
  if (!config.success) throw new ConnectorError('CONFIGURATION');
  const allowed = new Set(config.data.allowedChatIds);
  if (reminderChatId !== undefined && !allowed.has(reminderChatId))
    throw new ConnectorError('CONFIGURATION');
  const botId = token.slice(0, token.indexOf(':'));
  const http = createTelegramHttp(token, fetcher);
  const redact = (value: string) => value.replaceAll(token, '[redacted]');
  const connector: PollingConnector = {
    id: 'telegram',
    name: 'Telegram',
    configSchema: z.toJSONSchema(publicSchema),
    async poll({ signal }) {
      const sequence = repository.latestChangeSeq();
      const state = openTelegramState(`${statePath}.sqlite`, botId);
      try {
        const checkpoint = state.checkpoint();
        const offset =
          Date.now() - checkpoint.lastUpdateAt > RESET_OFFSET_AFTER_MS ? 0 : checkpoint.offset;
        const updates = await http.getUpdates(offset, signal);
        let nextOffset = offset;
        signal.throwIfAborted();
        for (const update of updates) {
          if (update.update_id < offset) continue;
          nextOffset = Math.max(nextOffset, update.update_id + 1);
          const message = update.message;
          if (!message || message.message_id === 0 || !allowed.has(String(message.chat.id)))
            continue;
          const text = message.text ? redact(message.text).trim() : '';
          if (text) capture(repository, botId, message.chat.id, message.message_id, text);
        }
        if (nextOffset !== offset) state.recordUpdates(nextOffset, Date.now());
        if (reminderChatId !== undefined) {
          await dispatchTelegramReminder({
            repository,
            state,
            http,
            chatId: reminderChatId,
            redact,
            signal,
          });
        }
        return { items: [], incomplete: updates.length === MAX_UPDATES };
      } finally {
        state.close();
        if (repository.latestChangeSeq() > sequence) onChanges?.();
      }
    },
  };
  return createConnectorRunner({ connector, repository, statePath, intervalMs });
}
