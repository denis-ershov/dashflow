import { asArray, asNumber, asRecord, asString } from '@/core/network/jsonReaders';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import type { RssItem } from '@/widgets/built-in/RssWidget/types';
import { dashboardRssInstances } from './subscriptions';

export interface FeedHeadline {
  title: string;
  link: string;
  timestamp: number;
}

const RETENTION_MS = 48 * 60 * 60 * 1000;
const MAX_HEADLINES = 50;
const MAX_SNAPSHOTS = 32;
const SNAPSHOT_FRESH_MS = 30 * 60 * 1000;
const articleCacheKey = (instanceId: string) => `dashflow_rss_articles.${instanceId}`;

interface ArticleSnapshot {
  key: string;
  items: RssItem[];
  failures: number;
  savedAt: number;
  requestedAt: number;
}

export async function readArticleSnapshot(instanceId: string, key: string) {
  const snapshot = await StorageAdapter.getLarge<ArticleSnapshot>(articleCacheKey(instanceId));
  if (!snapshot || snapshot.key !== key || snapshot.savedAt < Date.now() - RETENTION_MS)
    return null;
  return { ...snapshot, fresh: snapshot.savedAt >= Date.now() - SNAPSHOT_FRESH_MS };
}

export async function saveArticleSnapshot(
  instanceId: string,
  snapshot: Omit<ArticleSnapshot, 'savedAt'>,
) {
  let written = false;
  await StorageAdapter.updateLarge(articleCacheKey(instanceId), (raw) => {
    const lastRequest = asNumber(asRecord(raw).requestedAt);
    if (lastRequest !== undefined && lastRequest > snapshot.requestedAt) return raw;
    written = true;
    return { ...snapshot, savedAt: Date.now() };
  });
  if (written) await saveFeedHeadlines(instanceId, snapshot.items);
  return written;
}

function readHeadline(value: unknown): FeedHeadline[] {
  const raw = asRecord(value);
  const title = asString(raw.title)?.trim().slice(0, 260);
  const link = asString(raw.link);
  const timestamp = asNumber(raw.timestamp);
  if (!title || !link || link.length > 2_048 || timestamp === undefined || timestamp <= 0)
    return [];
  try {
    const url = new URL(link);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) {
      return [];
    }
    return [{ title, link: url.href, timestamp }];
  } catch {
    return [];
  }
}

function recentSnapshots(raw: unknown, now: number) {
  return asArray(raw).flatMap((entry) => {
    const value = asRecord(entry);
    const instanceId = asString(value.instanceId);
    const savedAt = asNumber(value.savedAt);
    if (!instanceId || savedAt === undefined || savedAt < now - RETENTION_MS) return [];
    return [{ instanceId, savedAt, headlines: asArray(value.headlines).slice(0, MAX_HEADLINES) }];
  });
}

/** Обновляется только после разрешённой загрузки лент виджета. */
export async function saveFeedHeadlines(instanceId: string, entries: readonly unknown[]) {
  const now = Date.now();
  const headlines = entries.slice(0, MAX_HEADLINES).flatMap(readHeadline);
  await StorageAdapter.updateLarge(STORAGE_KEYS.RSS_HEADLINES_CACHE, (raw) =>
    [
      { instanceId, savedAt: now, headlines },
      ...recentSnapshots(raw, now).filter((snapshot) => snapshot.instanceId !== instanceId),
    ].slice(0, MAX_SNAPSHOTS),
  );
}

export async function listRecentFeedHeadlines(since: number, limit = 10): Promise<FeedHeadline[]> {
  const [rawCache, saved] = await Promise.all([
    StorageAdapter.getLarge<unknown>(STORAGE_KEYS.RSS_HEADLINES_CACHE),
    StorageAdapter.get<unknown>(STORAGE_KEYS.DASHBOARD, null),
  ]);
  const active = new Set(dashboardRssInstances(saved).map(({ instanceId }) => instanceId));
  const unique = new Set<string>();
  return recentSnapshots(rawCache, Date.now())
    .filter(({ instanceId }) => active.has(instanceId))
    .flatMap(({ headlines }) => headlines.flatMap(readHeadline))
    .filter(({ timestamp }) => timestamp >= since)
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter(({ link }) => {
      if (unique.has(link)) return false;
      unique.add(link);
      return true;
    })
    .slice(0, limit);
}
