/**
 * Прокси RSS-лент в фоновом воркере: страница новой вкладки не может читать чужие ленты из-за
 * CORS, а воркер с выданным правом на хост — может. Здесь — контракт сообщений и сама загрузка,
 * без зависимостей от chrome.*, чтобы всё проверялось тестами.
 *
 * Модель угроз: адрес ленты вводит пользователь или приходит из импортированного OPML/плагина.
 * Воркер не должен стать прокси в локальную сеть (роутер, NAS, метаданные облака), поэтому
 * отклоняются приватные и служебные адреса — и в исходном URL, и после редиректов.
 * Остаточный риск: DNS-имя, указывающее на приватный IP (DNS rebinding), так не отсечь —
 * его ограничивают права на хосты, которые выдаются только для адресов лент.
 */

export const FEED_PROXY_LIMITS = {
  timeoutMs: 10_000,
  maxBytes: 2 * 1024 * 1024,
} as const;

export interface FetchRssFeedRequest {
  type: 'FETCH_RSS_FEED';
  url: string;
}

export type BackgroundRequest = FetchRssFeedRequest;

export type FeedProxyErrorCode =
  | 'BAD_REQUEST'
  | 'FORBIDDEN_SENDER'
  | 'FORBIDDEN_URL'
  | 'HTTP_ERROR'
  | 'TOO_LARGE'
  | 'TIMEOUT'
  | 'NETWORK';

export type FetchRssFeedResponse =
  { success: true; xml: string } | { success: false; error: FeedProxyErrorCode; status?: number };

export function isBackgroundRequest(message: unknown): message is BackgroundRequest {
  if (typeof message !== 'object' || message === null) return false;
  const { type, url } = message as Record<string, unknown>;
  return type === 'FETCH_RSS_FEED' && typeof url === 'string' && url.length <= 2048;
}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

function isPrivateIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local и метаданные облаков
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast и зарезервированные
  );
}

function isPrivateIpv6(host: string): boolean {
  if (!host.startsWith('[')) return false;
  const addr = host.slice(1, -1);
  return (
    addr === '::' ||
    addr === '::1' ||
    addr.startsWith('::ffff:') || // IPv4-mapped: за ним может стоять любой IPv4
    /^f[cd][0-9a-f]{0,2}:/.test(addr) || // fc00::/7 — уникальные локальные
    /^fe[89ab][0-9a-f]?:/.test(addr) // fe80::/10 — link-local
  );
}

/**
 * Можно ли ходить по адресу из воркера. WHATWG URL уже нормализует хост:
 * `http://2130706433/` и `http://0x7f.1/` превращаются в `127.0.0.1`.
 */
export function isPublicHttpUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost') return false;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;
  return !isPrivateIpv4(host) && !isPrivateIpv6(host);
}

class FeedTooLargeError extends Error {}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new FeedTooLargeError();
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FeedTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Загружает ленту с проверкой адреса до и после редиректов, таймаутом и лимитом размера */
export async function fetchFeedText(
  url: string,
  fetchImpl: typeof fetch = fetch,
  limits: { timeoutMs: number; maxBytes: number } = FEED_PROXY_LIMITS,
): Promise<FetchRssFeedResponse> {
  if (!isPublicHttpUrl(url)) return { success: false, error: 'FORBIDDEN_URL' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), limits.timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      credentials: 'omit',
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    // Редирект мог увести на приватный адрес — ответ такого запроса не отдаём
    if (response.url && !isPublicHttpUrl(response.url)) {
      return { success: false, error: 'FORBIDDEN_URL' };
    }
    if (!response.ok) return { success: false, error: 'HTTP_ERROR', status: response.status };
    return { success: true, xml: await readLimitedText(response, limits.maxBytes) };
  } catch (err) {
    if (err instanceof FeedTooLargeError) return { success: false, error: 'TOO_LARGE' };
    if (controller.signal.aborted) return { success: false, error: 'TIMEOUT' };
    return { success: false, error: 'NETWORK' };
  } finally {
    clearTimeout(timeoutId);
  }
}
