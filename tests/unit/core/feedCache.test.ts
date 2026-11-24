import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { listRecentFeedHeadlines, saveFeedHeadlines } from '@/core/feeds/cache';
import { markArticleRead, readArticleHistory, RSS_READ_LIMIT } from '@/core/feeds/history';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';

beforeEach(async () => {
  await StorageAdapter.updateLarge(STORAGE_KEYS.RSS_HEADLINES_CACHE, () => []);
  await StorageAdapter.set(STORAGE_KEYS.DASHBOARD, {
    state: {
      spaces: [
        { instances: [{ instanceId: 'rss-one', widgetId: 'rssReader' }] },
        { instances: [{ instanceId: 'rss-two', widgetId: 'rssReader' }] },
      ],
    },
  });
});

it('хранит до 5 000 недавних прочтений и не теряет параллельные отметки', async () => {
  const id = (index: number) => `rss-${index.toString(16).padStart(16, '0')}`;
  const full = Array.from({ length: RSS_READ_LIMIT }, (_, index) => id(index));
  await StorageAdapter.setLarge('dashflow_rss_read_articles', full);
  const newIds = [id(RSS_READ_LIMIT), id(RSS_READ_LIMIT + 1)];
  await Promise.all(newIds.map(markArticleRead));
  await markArticleRead(newIds[0]!);
  const history = await readArticleHistory();
  expect(history).toHaveLength(5_000);
  expect(history.slice(0, 2)).toEqual(newIds);
  expect(history).not.toContain(full.at(-1));
});

describe('Кеш заголовков для дайджеста', () => {
  it('объединяет заголовки двух пространств даже при параллельном сохранении', async () => {
    const timestamp = Date.now();
    await Promise.all([
      saveFeedHeadlines('rss-one', [{ title: 'One', link: 'https://example.test/a', timestamp }]),
      saveFeedHeadlines('rss-two', [
        { title: 'Two', link: 'https://example.test/b', timestamp: timestamp + 1 },
        { title: 'Duplicate', link: 'https://example.test/b', timestamp },
        { title: 'Old', link: 'https://example.test/c', timestamp: timestamp - 1000 },
        { title: 'Private', link: 'https://user:pass@example.test/d', timestamp },
      ]),
      saveFeedHeadlines('removed', [
        { title: 'Removed source', link: 'https://example.test/e', timestamp },
      ]),
    ]);
    expect((await listRecentFeedHeadlines(timestamp)).map(({ title }) => title)).toEqual([
      'Two',
      'One',
    ]);
  });
});
