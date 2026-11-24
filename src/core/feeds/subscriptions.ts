import { asArray, asNumber, asRecord, asString } from '@/core/network/jsonReaders';
import { displayHost } from '@/core/network/url';
import { isPublicHttpUrl } from '@/core/network/feedProxy';
import { DEFAULT_FEEDS, DEFAULT_FOLDER } from '@/widgets/built-in/RssWidget/presets';
import type { RssFeedConfig } from '@/widgets/built-in/RssWidget/types';

function configuredFeeds(settings: Record<string, unknown>): RssFeedConfig[] {
  if (Array.isArray(settings.feeds)) {
    return settings.feeds.flatMap((raw: unknown) => {
      const entry = asRecord(raw);
      const url = asString(entry.url);
      const id = asString(entry.id);
      if (!url || !id) return [];
      return [
        {
          id,
          url,
          enabled: entry.enabled !== false,
          name: asString(entry.name) ?? displayHost(url),
          folder: asString(entry.folder),
          color: asString(entry.color),
          icon: asString(entry.icon),
        },
      ];
    });
  }
  const urls = asArray(settings.feedUrls).flatMap((raw) =>
    typeof raw === 'string' && raw ? [raw] : [],
  );
  const single = asString(settings.feedUrl);
  if (urls.length) {
    return urls.map((url, index) => ({
      id: `feed-legacy-${index}`,
      url,
      name: displayHost(url),
      folder: DEFAULT_FOLDER,
      enabled: true,
    }));
  }
  return single
    ? [
        {
          id: 'feed-legacy-single',
          url: single,
          name: displayHost(single),
          folder: DEFAULT_FOLDER,
          enabled: true,
        },
      ]
    : DEFAULT_FEEDS;
}

export const readFeedSettings = (settings: unknown) => configuredFeeds(asRecord(settings));

export function activeFeedSettings(feeds: readonly RssFeedConfig[]): RssFeedConfig[] {
  return feeds.filter(
    (feed) => feed.enabled !== false && feed.url.length <= 2_048 && isPublicHttpUrl(feed.url),
  );
}

export function articleLimit(value: unknown): number {
  return Math.max(1, Math.min(1_000, Math.floor(asNumber(value) ?? 15)));
}

export function dashboardRssInstances(saved: unknown) {
  const state = asRecord(asRecord(saved).state);
  const spaces = asArray(state.spaces);
  const entries = spaces.length
    ? spaces.flatMap((space) => asArray(asRecord(space).instances))
    : asArray(state.instances);
  return entries.flatMap((entry) => {
    const value = asRecord(entry);
    const instanceId = asString(value.instanceId);
    return value.widgetId === 'rssReader' && instanceId
      ? [{ instanceId, settings: asRecord(value.settings) }]
      : [];
  });
}
