import { describe, it, expect } from 'vitest';
import { validatePluginManifest, isSecureUrl } from '@/core/plugins/validator';

describe('Plugin Manifest Validator', () => {
  it('isSecureUrl должен пропускать https и отклонять другие протоколы', () => {
    expect(isSecureUrl('https://example.com/feed.xml')).toBe(true);
    expect(isSecureUrl('http://example.com')).toBe(false);
    expect(isSecureUrl('javascript:alert(1)')).toBe(false);
    expect(isSecureUrl('data:text/html,<h1>test</h1>')).toBe(false);
    expect(isSecureUrl('invalid-url')).toBe(false);
  });

  it('должен валидировать корректный RSS плагин', () => {
    const validRss = {
      id: 'tech_news',
      name: 'Tech News',
      version: '1.0.0',
      author: 'Tester',
      type: 'rss',
      description: 'RSS news feed',
      permissions: ['network', 'storage'],
      size: { defaultW: 6, defaultH: 4 },
      config: {
        feedUrl: 'https://news.ycombinator.com/rss',
      },
    };

    const res = validatePluginManifest(validRss);
    expect(res.valid).toBe(true);
    expect(res.manifest?.id).toBe('tech_news');
  });

  it('должен валидировать корректный Embed плагин', () => {
    const validEmbed = {
      id: 'calc_app',
      name: 'Calculator',
      version: '1.0.0',
      author: 'Tester',
      type: 'embed',
      description: 'Embedded calculator',
      permissions: ['storage'],
      size: { defaultW: 4, defaultH: 4 },
      config: {
        url: 'https://calculator.net',
      },
    };

    const res = validatePluginManifest(validEmbed);
    expect(res.valid).toBe(true);
  });

  it('должен отклонять плагин с небезопасным URL (http:// или javascript:)', () => {
    const malicious = {
      id: 'bad_plugin',
      name: 'Bad',
      version: '1.0.0',
      author: 'Hacker',
      type: 'embed',
      description: 'XSS attempt',
      permissions: ['storage'],
      size: { defaultW: 4, defaultH: 4 },
      config: {
        url: 'javascript:alert(1)',
      },
    };

    const res = validatePluginManifest(malicious);
    expect(res.valid).toBe(false);
    expect(res.errors?.some((e) => e.includes('HTTPS URL'))).toBe(true);
  });

  it('должен отклонять плагин с некорректным ID или типом', () => {
    const invalid = {
      id: 'bad id with spaces!',
      name: 'Test',
      version: '1.0.0',
      author: 'Tester',
      type: 'unknown_type',
      description: 'Test',
      permissions: ['unknown_perm'],
      size: { defaultW: 0, defaultH: 50 },
      config: {},
    };

    const res = validatePluginManifest(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors?.length).toBeGreaterThanOrEqual(4);
  });
});
