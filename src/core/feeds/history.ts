import { StorageAdapter } from '@/core/storage';
import { publishFeedChange } from './events';

const KEY = 'dashflow_rss_read_articles';
export const RSS_READ_LIMIT = 5_000;

function readIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((id): id is string => typeof id === 'string' && /^rss-[\da-f]{16}$/.test(id))
    .slice(0, RSS_READ_LIMIT);
}

export async function readArticleHistory() {
  return readIds(await StorageAdapter.getLarge<unknown>(KEY));
}

export async function markArticleRead(id: string) {
  await StorageAdapter.updateLarge(KEY, (raw) => {
    const prior = readIds(raw);
    return [id, ...prior.filter((value) => value !== id)].slice(0, RSS_READ_LIMIT);
  });
  publishFeedChange({ history: true });
}
