import { asArray, asRecord, asString } from '@/core/network/jsonReaders';

export interface NexusChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface NexusChatConfig {
  endpointUrl: string;
  bearerToken?: string;
  adminUrl?: string;
  model?: string;
}

export type NexusChatErrorCode =
  | 'INVALID_URL'
  | 'ABORTED'
  | 'OFFLINE'
  | 'UNAUTHORIZED'
  | 'QUOTA_PAUSED'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE';

export type NexusChatResult =
  | { ok: true; reply: string }
  | {
      ok: false;
      kind: 'quota_paused' | 'offline' | 'unauthorized' | 'error';
      code: NexusChatErrorCode;
      message?: string;
      status?: number;
      resetAt?: string;
    };

const REQUEST_TIMEOUT_MS = 20_000;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Разрешает только HTTPS или локальный HTTP (localhost / 127.0.0.1 / [::1]) без учётных данных в URL.
 */
export function isAllowedNexusUrl(rawUrl?: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2_048) return false;

  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return false;
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Формирует безопасный endpoint `POST <hubBase>/chat/v1/chat/completions`,
 * очищая query-параметры и hash.
 */
export function resolveChatCompletionsUrl(rawUrl: string): string | undefined {
  if (!isAllowedNexusUrl(rawUrl)) return undefined;
  const url = new URL(rawUrl.trim());
  url.search = '';
  url.hash = '';
  const normalizedPath = url.pathname.replace(/\/+$/, '');

  if (
    normalizedPath.endsWith('/chat/v1/chat/completions') ||
    normalizedPath.endsWith('/v1/chat/completions')
  ) {
    url.pathname = normalizedPath;
  } else if (normalizedPath.endsWith('/chat/v1')) {
    url.pathname = `${normalizedPath}/chat/completions`;
  } else if (normalizedPath.endsWith('/chat')) {
    url.pathname = `${normalizedPath}/v1/chat/completions`;
  } else {
    url.pathname = `${normalizedPath}/chat/v1/chat/completions`;
  }

  return url.toString();
}

/**
 * Возвращает валидный URL веб-админки: явный `adminUrl` или `<origin>/admin` от endpoint.
 */
export function resolveSafeAdminUrl(adminUrl?: string, endpointUrl?: string): string | undefined {
  if (isAllowedNexusUrl(adminUrl)) {
    return new URL(adminUrl!.trim()).toString();
  }
  if (isAllowedNexusUrl(endpointUrl)) {
    return `${new URL(endpointUrl!.trim()).origin}/admin`;
  }
  return undefined;
}

function extractAssistantReply(payload: unknown): string | undefined {
  const root = asRecord(payload);
  const choices = asArray(root.choices);
  if (choices.length > 0) {
    const first = asRecord(choices[0]);
    const message = asRecord(first.message);
    const content = asString(message.content) ?? asString(first.text);
    if (content && content.trim().length > 0) {
      return content.trim();
    }
  }
  const directReply = asString(root.reply);
  return directReply && directReply.trim().length > 0 ? directReply.trim() : undefined;
}

/**
 * Отправляет историю сообщений в OpenAI-совместимый endpoint Nexus Hub.
 * Токен авторизации никогда не включается в возвращаемые поля и логи.
 */
export async function sendNexusMessage(
  messages: NexusChatMessage[],
  config: NexusChatConfig,
  signal?: AbortSignal,
): Promise<NexusChatResult> {
  const targetUrl = resolveChatCompletionsUrl(config.endpointUrl);
  if (!targetUrl) {
    return {
      ok: false,
      kind: 'error',
      code: 'INVALID_URL',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      kind: 'offline',
      code: 'OFFLINE',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      return {
        ok: false,
        kind: 'error',
        code: 'ABORTED',
      };
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  const token = config.bearerToken?.trim();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model?.trim() || 'nexus-default',
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError' && signal?.aborted) {
      return {
        ok: false,
        kind: 'error',
        code: 'ABORTED',
      };
    }
    return {
      ok: false,
      kind: 'offline',
      code: 'OFFLINE',
    };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  const body = asRecord(payload);
  const nestedError = asRecord(body.error);
  const errorCode = asString(body.code) ?? asString(nestedError.code);
  const serverMessage = asString(body.message) ?? asString(nestedError.message);

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      kind: 'unauthorized',
      code: 'UNAUTHORIZED',
      status: response.status,
    };
  }

  if (response.status === 429 || errorCode === 'QUOTA_PAUSED') {
    const resetAt =
      asString(body.resetAt) ??
      asString(body.reset_at) ??
      asString(nestedError.resetAt) ??
      asString(nestedError.reset_at);

    return {
      ok: false,
      kind: 'quota_paused',
      code: 'QUOTA_PAUSED',
      status: response.status,
      ...(serverMessage ? { message: serverMessage } : {}),
      ...(resetAt ? { resetAt } : {}),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      kind: 'error',
      code: 'HTTP_ERROR',
      status: response.status,
      ...(serverMessage ? { message: serverMessage } : {}),
    };
  }

  const reply = extractAssistantReply(payload);
  if (!reply) {
    return {
      ok: false,
      kind: 'error',
      code: 'INVALID_RESPONSE',
    };
  }

  return { ok: true, reply };
}
