import type { FetchRssFeedResponse } from '@/core/network/feedProxy';
import type { RssFeedConfig, RssItem } from '@/widgets/built-in/RssWidget/types';
import { readArticleSnapshot, saveArticleSnapshot } from './cache';
import { publishFeedChange } from './events';
import { parseFeedXml } from './parser';

export type FetchFeed = (url: string) => Promise<FetchRssFeedResponse>;

const FETCH_CONCURRENCY = 6;
const MAX_ITEMS = 2_000;
const MAX_READER_CHARS = 2_000_000;

export function feedSnapshotKey(feeds: readonly RssFeedConfig[], limit: number) {
  return JSON.stringify([
    limit,
    feeds.map(({ id, url, name, color, folder }) => [id, url, name, color, folder]),
  ]);
}

async function articlesFor(feed: RssFeedConfig, limit: number, fetchFeed: FetchFeed) {
  try {
    const response = await fetchFeed(feed.url);
    return response.success ? parseFeedXml(response.xml, feed, limit) : null;
  } catch {
    return null;
  }
}

function trimReaderText(items: RssItem[]) {
  const limited = items.slice(0, MAX_ITEMS);
  const maxLength = Math.floor(MAX_READER_CHARS / Math.max(1, limited.length));
  return limited.map((item) => ({ ...item, readerText: item.readerText?.slice(0, maxLength) }));
}

export async function refreshArticleSnapshot(
  instanceId: string,
  feeds: readonly RssFeedConfig[],
  limit: number,
  fetchFeed: FetchFeed,
) {
  const requestedAt = Date.now();
  const key = feedSnapshotKey(feeds, limit);
  const previous = await readArticleSnapshot(instanceId, key);
  const cachedByFeed = new Map<string, RssItem[]>();
  for (const item of previous?.items ?? []) {
    if (!item.feedId) continue;
    const list = cachedByFeed.get(item.feedId) ?? [];
    list.push(item);
    cachedByFeed.set(item.feedId, list);
  }

  const accepted: RssItem[] = [];
  let failures = 0;
  for (let offset = 0; offset < feeds.length; offset += FETCH_CONCURRENCY) {
    const batch = feeds.slice(offset, offset + FETCH_CONCURRENCY);
    const results = await Promise.all(batch.map((feed) => articlesFor(feed, limit, fetchFeed)));
    for (const [index, feed] of batch.entries()) {
      const result = results[index];
      if (!result) failures++;
      for (const item of result ?? cachedByFeed.get(feed.id) ?? []) accepted.push(item);
    }
  }
  const items = trimReaderText(
    accepted.sort((first, second) => (second.timestamp ?? 0) - (first.timestamp ?? 0)),
  );
  if (failures < feeds.length || feeds.length === 0) {
    if (await saveArticleSnapshot(instanceId, { key, items, failures, requestedAt })) {
      publishFeedChange({ instanceId });
    }
  }
  return { items, failures };
}
