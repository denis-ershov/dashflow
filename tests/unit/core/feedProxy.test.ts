import { describe, it, expect, vi } from 'vitest';
import { fetchFeedText, isBackgroundRequest, isPublicHttpUrl } from '@/core/network/feedProxy';

const okResponse = (
  body: string,
  init: { url?: string; headers?: Record<string, string> } = {},
) => {
  const response = new Response(body, { status: 200, headers: init.headers });
  Object.defineProperty(response, 'url', { value: init.url ?? 'https://example.com/feed' });
  return response;
};

describe('Прокси RSS: проверка адресов', () => {
  it.each([
    'https://habr.com/rss',
    'http://example.com/feed.xml',
    'https://8.8.8.8/feed',
    'https://[2001:db8::1]/feed',
  ])('пропускает публичный адрес %s', (url) => {
    expect(isPublicHttpUrl(url)).toBe(true);
  });

  it.each([
    'http://localhost/feed',
    'http://router.localhost/',
    'http://nas.local/rss',
    'http://printer.lan/',
    'http://box.home.arpa/',
    'http://127.0.0.1/',
    'http://2130706433/', // десятичная запись 127.0.0.1
    'http://0x7f.1/', // шестнадцатеричная
    'http://10.0.0.1/',
    'http://172.20.1.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/',
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[fd00::1]/',
    'http://[fe80::1]/',
    'http://user:pass@example.com/',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'не адрес',
  ])('отклоняет %s', (url) => {
    expect(isPublicHttpUrl(url)).toBe(false);
  });
});

describe('Прокси RSS: контракт сообщений', () => {
  it('принимает только запрос ленты со строковым адресом', () => {
    expect(isBackgroundRequest({ type: 'FETCH_RSS_FEED', url: 'https://a.b/rss' })).toBe(true);
    expect(isBackgroundRequest({ type: 'FETCH_RSS_FEED', url: 42 })).toBe(false);
    expect(isBackgroundRequest({ type: 'OTHER', url: 'https://a.b' })).toBe(false);
    expect(isBackgroundRequest({ type: 'FETCH_RSS_FEED', url: 'x'.repeat(3000) })).toBe(false);
    expect(isBackgroundRequest(null)).toBe(false);
  });
});

describe('Прокси RSS: загрузка', () => {
  it('возвращает текст ленты', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse('<rss/>'));
    expect(await fetchFeedText('https://example.com/feed', fetchImpl)).toEqual({
      success: true,
      xml: '<rss/>',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.com/feed',
      expect.objectContaining({ credentials: 'omit' }),
    );
  });

  it('не делает запрос к приватному адресу', async () => {
    const fetchImpl = vi.fn();
    expect(await fetchFeedText('http://192.168.0.1/', fetchImpl)).toEqual({
      success: false,
      error: 'FORBIDDEN_URL',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('не отдаёт ответ после редиректа на приватный адрес', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse('secret', { url: 'http://10.0.0.1/' }));
    expect(await fetchFeedText('https://example.com/feed', fetchImpl)).toEqual({
      success: false,
      error: 'FORBIDDEN_URL',
    });
  });

  it('сообщает HTTP-статус без деталей ответа', async () => {
    const response = new Response('nope', { status: 404 });
    Object.defineProperty(response, 'url', { value: 'https://example.com/feed' });
    const fetchImpl = vi.fn().mockResolvedValue(response);
    expect(await fetchFeedText('https://example.com/feed', fetchImpl)).toEqual({
      success: false,
      error: 'HTTP_ERROR',
      status: 404,
    });
  });

  it('обрывает слишком большой ответ', async () => {
    const limits = { timeoutMs: 1000, maxBytes: 10 };
    const big = vi.fn().mockResolvedValue(okResponse('x'.repeat(11)));
    expect(await fetchFeedText('https://example.com/feed', big, limits)).toEqual({
      success: false,
      error: 'TOO_LARGE',
    });

    const declared = vi
      .fn()
      .mockResolvedValue(okResponse('x', { headers: { 'content-length': '999' } }));
    expect(await fetchFeedText('https://example.com/feed', declared, limits)).toEqual({
      success: false,
      error: 'TOO_LARGE',
    });
  });

  it('различает таймаут и сетевую ошибку', async () => {
    const hanging = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        }),
    );
    expect(
      await fetchFeedText('https://example.com/feed', hanging as unknown as typeof fetch, {
        timeoutMs: 5,
        maxBytes: 100,
      }),
    ).toEqual({ success: false, error: 'TIMEOUT' });

    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchFeedText('https://example.com/feed', offline)).toEqual({
      success: false,
      error: 'NETWORK',
    });
  });
});
