import { useCallback, useEffect, useState } from 'react';
import { readArticleSnapshot } from '@/core/feeds/cache';
import { subscribeFeedChanges } from '@/core/feeds/events';
import { markArticleRead, readArticleHistory } from '@/core/feeds/history';
import { feedSnapshotKey, refreshArticleSnapshot } from '@/core/feeds/refresh';
import { fetchArticleFeed } from './rssParser';
import type { RssFeedConfig, RssItem } from './types';

export function useRssArticles(
  instanceId: string,
  feeds: readonly RssFeedConfig[],
  limit: number,
  hasAccess: boolean | null,
  refreshInterval: number,
) {
  const [snapshot, setSnapshot] = useState<{ key: string; items: RssItem[]; failures: number }>();
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const key = feedSnapshotKey(feeds, limit);
  const empty = feeds.length === 0;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (hasAccess !== true) return;
    let current = true;

    async function load() {
      if (empty) return;
      const cached = await readArticleSnapshot(instanceId, key).catch(() => null);
      if (!current) return;
      if (cached) setSnapshot(cached);
      if (cached?.fresh && cached.failures === 0 && revision === 0) {
        setRefreshing(false);
        return;
      }
      setRefreshing(true);
      try {
        const entries = await refreshArticleSnapshot(instanceId, feeds, limit, fetchArticleFeed);
        if (current) setSnapshot({ key, ...entries });
      } catch {
        if (current) setSnapshot({ key, items: cached?.items ?? [], failures: feeds.length });
      } finally {
        if (current) setRefreshing(false);
      }
    }

    const unsubscribe = subscribeFeedChanges((event) => {
      if (!('instanceId' in event) || event.instanceId !== instanceId) return;
      void readArticleSnapshot(instanceId, key).catch(() => null).then((entry) => {
        if (current && entry) setSnapshot(entry);
      });
    });
    void load();
    return () => {
      current = false;
      unsubscribe();
    };
  }, [empty, feeds, hasAccess, instanceId, key, limit, revision]);

  useEffect(() => {
    if (hasAccess !== true || refreshInterval <= 0) return;
    const timer = setInterval(refresh, refreshInterval * 60_000);
    return () => clearInterval(timer);
  }, [hasAccess, refresh, refreshInterval]);

  const visible = hasAccess === true && snapshot?.key === key ? snapshot : undefined;
  return {
    items: visible?.items ?? [],
    loading: !empty && !visible,
    refreshing: !empty && hasAccess === true && refreshing,
    failures: visible?.failures ?? 0,
    refresh,
  };
}

export function useReadArticles() {
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    let mounted = true;
    const reload = () => {
      void readArticleHistory().then((ids) => {
        if (mounted) setReadIds(new Set(ids));
      }, () => {
        // Сохраняем уже показанное состояние, если хранилище временно недоступно.
      });
    };
    reload();
    const unsubscribe = subscribeFeedChanges((event) => {
      if ('history' in event) reload();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    await markArticleRead(id);
    setReadIds(new Set(await readArticleHistory()));
  }, []);
  return { readIds, markRead };
}
