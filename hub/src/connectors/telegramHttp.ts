import { z } from 'zod';
import { ConnectorError } from './contract.js';

const MAX_BODY = 512 * 1024;
const TIMEOUT_MS = 20_000;
export const MAX_UPDATES = 25;

const chat = z.object({ id: z.int().refine((id) => id !== 0 && Math.abs(id) < 2 ** 52) });
const message = z.object({
  message_id: z.int().nonnegative(),
  chat,
  text: z.string().max(16_384).optional(),
});
const updates = z
  .array(
    z.object({
      update_id: z
        .int()
        .nonnegative()
        .max(Number.MAX_SAFE_INTEGER - 1),
      message: message.optional(),
    }),
  )
  .max(MAX_UPDATES);
const envelope = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), result: z.unknown() }),
  z.object({
    ok: z.literal(false),
    error_code: z.int(),
    parameters: z.object({ retry_after: z.int().positive().max(86_400).optional() }).optional(),
  }),
]);

async function readResponse(response: Response) {
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (type !== 'application/json' || !response.body) {
    await response.body?.cancel();
    throw new ConnectorError('INVALID_RESPONSE');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const value: unknown = chunk.value;
      if (!(value instanceof Uint8Array)) throw new ConnectorError('INVALID_RESPONSE');
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new ConnectorError('INVALID_RESPONSE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size));
    const input: unknown = JSON.parse(text);
    return envelope.parse(input);
  } catch {
    throw new ConnectorError('INVALID_RESPONSE');
  }
}

export class TelegramRateLimit extends ConnectorError {
  constructor(retryAfter: number) {
    super('RATE_LIMITED', Date.now() + retryAfter * 1000);
  }
}

export function createTelegramHttp(token: string, fetcher: typeof fetch) {
  async function request(method: 'getUpdates' | 'sendMessage', body: object, signal: AbortSignal) {
    try {
      signal.throwIfAborted();
      const response = await fetcher(
        new URL(`/bot${token}/${method}`, 'https://api.telegram.org'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          redirect: 'error',
          signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
        },
      );
      if ([401, 403, 409].includes(response.status) || response.status >= 500) {
        await response.body?.cancel();
        if (response.status === 409) throw new ConnectorError('CONFIGURATION');
        throw new ConnectorError(response.status >= 500 ? 'UNAVAILABLE' : 'UNAUTHORIZED');
      }
      const output = await readResponse(response);
      if (!output.ok && output.error_code === 429 && response.status === 429) {
        throw new TelegramRateLimit(output.parameters?.retry_after ?? 60);
      }
      if (!response.ok || !output.ok) throw new ConnectorError('INVALID_RESPONSE');
      return output.result;
    } catch (error) {
      if (error instanceof ConnectorError) throw error;
      // Ошибки HTTP-клиента могут содержать путь с токеном.
      throw new ConnectorError('UNAVAILABLE');
    }
  }

  return {
    async getUpdates(offset: number, signal: AbortSignal) {
      const result = updates.safeParse(
        await request(
          'getUpdates',
          {
            offset,
            limit: MAX_UPDATES,
            timeout: 10,
            allowed_updates: ['message'],
          },
          signal,
        ),
      );
      if (!result.success) throw new ConnectorError('INVALID_RESPONSE');
      return result.data;
    },
    async sendMessage(chatId: string, text: string, signal: AbortSignal) {
      const result = message.safeParse(
        await request(
          'sendMessage',
          {
            chat_id: chatId,
            text,
            link_preview_options: { is_disabled: true },
          },
          signal,
        ),
      );
      if (!result.success || String(result.data.chat.id) !== chatId)
        throw new ConnectorError('INVALID_RESPONSE');
    },
  };
}
