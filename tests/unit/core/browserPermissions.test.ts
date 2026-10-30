import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  hasBrowserPermissions,
  originPatternFor,
  originPatternsFor,
  requestBrowserPermissions,
} from '@/core/permissions/browserPermissions';

type Callback = (granted: boolean) => void;

function stubChrome(granted: boolean) {
  const contains = vi.fn((_req: unknown, cb: Callback) => cb(granted));
  const request = vi.fn((_req: unknown, cb: Callback) => cb(granted));
  vi.stubGlobal('chrome', {
    runtime: { id: 'dashflow', lastError: undefined },
    permissions: { contains, request },
  });
  return { contains, request };
}

describe('Необязательные права браузера', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('строит шаблон хоста только для http(s)', () => {
    expect(originPatternFor('https://habr.com/ru/rss/all/')).toBe('https://habr.com/*');
    expect(originPatternFor('http://example.com:8080/feed')).toBe('http://example.com/*');
    expect(originPatternFor('ftp://example.com/')).toBeNull();
    expect(originPatternFor('мусор')).toBeNull();
  });

  it('убирает дубли шаблонов', () => {
    expect(
      originPatternsFor(['https://a.com/1', 'https://a.com/2', 'https://b.com/', 'bad']),
    ).toEqual(['https://a.com/*', 'https://b.com/*']);
  });

  it('вне расширения считает права выданными', async () => {
    expect(await hasBrowserPermissions({ permissions: ['bookmarks'] })).toBe(true);
    expect(await requestBrowserPermissions({ origins: ['https://a.com/*'] })).toBe(true);
  });

  it('спрашивает браузер и передаёт права и хосты', async () => {
    const { contains } = stubChrome(false);
    expect(await hasBrowserPermissions({ permissions: ['tabs'] })).toBe(false);
    expect(contains).toHaveBeenCalledWith(
      { permissions: ['tabs'], origins: [] },
      expect.any(Function),
    );

    const { request } = stubChrome(true);
    expect(await requestBrowserPermissions({ origins: ['https://a.com/*'] })).toBe(true);
    expect(request).toHaveBeenCalledWith(
      { permissions: [], origins: ['https://a.com/*'] },
      expect.any(Function),
    );
  });

  it('пустой запрос не обращается к браузеру', async () => {
    const { contains } = stubChrome(false);
    expect(await hasBrowserPermissions({})).toBe(true);
    expect(contains).not.toHaveBeenCalled();
  });
});
