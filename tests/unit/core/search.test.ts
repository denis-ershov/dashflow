import { describe, it, expect } from 'vitest';
import { resolveSearchTarget, getSearchEngine, SEARCH_ENGINES } from '@/core/search';

const google = SEARCH_ENGINES.google;

describe('resolveSearchTarget', () => {
  it('пустой запрос никуда не ведёт', () => {
    expect(resolveSearchTarget('   ', google)).toBeNull();
  });

  it('адрес со схемой http(s) открывается напрямую', () => {
    expect(resolveSearchTarget(' https://example.com/a?b=1 ', google)).toBe(
      'https://example.com/a?b=1',
    );
  });

  it('домен без схемы получает https://', () => {
    expect(resolveSearchTarget('github.com', google)).toBe('https://github.com');
    expect(resolveSearchTarget('docs.example.co.uk/path', google)).toBe(
      'https://docs.example.co.uk/path',
    );
    expect(resolveSearchTarget('example.com:8080', google)).toBe('https://example.com:8080');
  });

  it('обычный текст и опасные схемы уходят в поисковик, а не открываются', () => {
    expect(resolveSearchTarget('погода москва', google)).toBe(
      `${google.url}${encodeURIComponent('погода москва')}`,
    );
    expect(resolveSearchTarget('javascript:alert(1)', google)).toBe(
      `${google.url}${encodeURIComponent('javascript:alert(1)')}`,
    );
    expect(resolveSearchTarget('node.js tutorial', google)).toContain(google.url);
    // Числа и версии — не домены: зона должна быть буквенной
    expect(resolveSearchTarget('3.14', google)).toContain(google.url);
    expect(resolveSearchTarget('v1.2', google)).toContain(google.url);
  });

  it('использует URL выбранного поисковика', () => {
    expect(resolveSearchTarget('react', SEARCH_ENGINES.github)).toBe(
      'https://github.com/search?q=react',
    );
  });
});

describe('getSearchEngine', () => {
  it('неизвестный или пустой id — Google', () => {
    expect(getSearchEngine('altavista').id).toBe('google');
    expect(getSearchEngine(undefined).id).toBe('google');
    expect(getSearchEngine('toString').id).toBe('google');
  });
});
