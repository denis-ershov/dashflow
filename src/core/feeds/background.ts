import { browser } from 'wxt/browser';
import { fetchFeedText, type FetchRssFeedResponse } from '@/core/network/feedProxy';
import { hasBrowserPermissions, originPatternFor } from '@/core/permissions/browserPermissions';
import { STORAGE_KEYS } from '@/core/storage';
import { refreshArticleSnapshot } from './refresh';
import {
  activeFeedSettings,
  articleLimit,
  dashboardRssInstances,
  readFeedSettings,
} from './subscriptions';

const RSS_REFRESH_ALARM = 'dashflow-rss-refresh';
const PERIOD_MINUTES = 30;

export async function fetchPermittedFeedText(url: string): Promise<FetchRssFeedResponse> {
  const origin = originPatternFor(url);
  if (!origin || !(await hasBrowserPermissions({ origins: [origin] }))) {
    return { success: false, error: 'FORBIDDEN_URL' };
  }
  // Браузер не раскрывает Location при ручном редиректе. Требуем конечный адрес,
  // чтобы воркер не обращался к другому хосту без проверки его разрешения.
  return fetchFeedText(url, (input, init) => fetch(input, { ...init, redirect: 'error' }));
}

async function refreshSubscriptions() {
  const raw = await browser.storage.local.get(STORAGE_KEYS.DASHBOARD);
  const instances = dashboardRssInstances(raw[STORAGE_KEYS.DASHBOARD]);
  for (const { instanceId, settings } of instances) {
    if (settings.refreshInterval === 0) continue;
    const feeds = activeFeedSettings(readFeedSettings(settings));
    if (!feeds.length) continue;
    try {
      await refreshArticleSnapshot(
        instanceId,
        feeds,
        articleLimit(settings.itemCount),
        fetchPermittedFeedText,
      );
    } catch {
      console.warn('[DashFlow] Не удалось сохранить обновлённые RSS-ленты');
    }
  }
}

export function startRssBackground() {
  async function schedule() {
    const current = await browser.alarms.get(RSS_REFRESH_ALARM);
    if (current?.periodInMinutes !== PERIOD_MINUTES) {
      await browser.alarms.create(RSS_REFRESH_ALARM, { periodInMinutes: PERIOD_MINUTES });
    }
  }

  const ensureAlarm = () => {
    void schedule().catch(() => console.warn('[DashFlow] Не удалось запланировать обновление RSS'));
  };
  let refreshing = false;
  browser.alarms.onAlarm.addListener(({ name }) => {
    if (name !== RSS_REFRESH_ALARM || refreshing) return;
    refreshing = true;
    void refreshSubscriptions()
      .catch(() => {
        console.warn('[DashFlow] Не удалось обновить RSS-ленты');
      })
      .finally(() => {
        refreshing = false;
      });
  });
  browser.runtime.onStartup.addListener(ensureAlarm);
  browser.runtime.onInstalled.addListener(ensureAlarm);
  ensureAlarm();
}
