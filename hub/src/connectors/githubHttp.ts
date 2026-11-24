import { setTimeout as delay } from 'node:timers/promises';
import { ConnectorError } from './contract.js';

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT = 8_000;
const FALLBACK_RATE_DELAY = 60_000;

async function responseJson(response: Response): Promise<unknown> {
  const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    await response.body?.cancel();
    throw new ConnectorError('INVALID_RESPONSE');
  }
  if (!response.body) throw new ConnectorError('INVALID_RESPONSE');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const value: unknown = chunk.value;
      if (!(value instanceof Uint8Array)) throw new ConnectorError('INVALID_RESPONSE');
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ConnectorError('INVALID_RESPONSE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const content = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length));
    return JSON.parse(content) as unknown;
  } catch {
    throw new ConnectorError('INVALID_RESPONSE');
  }
}

function rateDelay(headers: Headers, now: number) {
  const retry = headers.get('retry-after');
  const retryMs = retry && /^\d{1,8}$/.test(retry) ? Number(retry) * 1000 : 0;
  const resetHeader = headers.get('x-ratelimit-reset');
  const reset =
    headers.get('x-ratelimit-remaining') === '0' && resetHeader && /^\d{1,12}$/.test(resetHeader)
      ? Number(resetHeader) * 1000 - now
      : 0;
  return now + Math.max(retryMs, Math.min(86_400_000, reset), FALLBACK_RATE_DELAY);
}

function statusError(response: Response) {
  const { status, headers } = response;
  if (
    status === 429 ||
    (status === 403 && (headers.has('retry-after') || headers.get('x-ratelimit-remaining') === '0'))
  ) {
    return new ConnectorError('RATE_LIMITED', rateDelay(headers, Date.now()));
  }
  if (status === 401 || status === 403) return new ConnectorError('UNAUTHORIZED');
  if (status >= 500 || status === 408) return new ConnectorError('UNAVAILABLE');
  if (status === 422) return new ConnectorError('CONFIGURATION');
  return new ConnectorError('INVALID_RESPONSE');
}

export function githubSearch(token: string, fetcher: typeof fetch) {
  return async (parameters: URLSearchParams, signal: AbortSignal): Promise<unknown> => {
    const url = new URL('https://api.github.com/search/issues');
    url.search = parameters.toString();
    for (let attempt = 0; ; attempt++) {
      try {
        signal.throwIfAborted();
        const response = await fetcher(url, {
          method: 'GET',
          redirect: 'error',
          signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)]),
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2026-03-10',
            'User-Agent': 'DashFlow-Hub',
          },
        });
        if (response.status === 200) return await responseJson(response);
        await response.body?.cancel();
        throw statusError(response);
      } catch (error) {
        const safe = error instanceof ConnectorError ? error : new ConnectorError('UNAVAILABLE');
        if (safe.code !== 'UNAVAILABLE' || attempt >= 1 || signal.aborted) throw safe;
        try {
          await delay(250, undefined, { signal });
        } catch {
          throw new ConnectorError('UNAVAILABLE');
        }
      }
    }
  };
}
