import { browser } from 'wxt/browser';
import { listRecentFeedHeadlines } from '@/core/feeds/cache';
import { itemRepository } from '@/core/items/instance';
import { asRecord } from '@/core/network/jsonReaders';
import { getCachedWeatherData } from '@/widgets/built-in/WeatherWidget/weatherService';
import {
  DIGEST_ALARM,
  DIGEST_SCHEDULE_KEY,
  DIGEST_SOURCE,
  morningRunTime,
  morningTag,
  nextMorningRunTime,
} from './model';
import { buildMorningDigest, NEWS_LIMIT, NEWS_WINDOW_MS } from './morning';

const LANGUAGE_KEY = 'dashflow_i18n_store';

async function getLanguage() {
  const preferences = await browser.storage.local.get(LANGUAGE_KEY);
  const preferred = asRecord(asRecord(preferences[LANGUAGE_KEY]).state).language;
  if (preferred === 'ru' || preferred === 'en') return preferred;
  return browser.i18n.getUILanguage().toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en';
}

async function createMorningDigest(now: Date): Promise<void> {
  const [existing] = await itemRepository.query({
    kind: 'digest',
    tag: morningTag(now),
    includeArchived: true,
    includeDeleted: true,
    limit: 1,
  });
  if (existing) return;

  const [language, tasks, weather, headlines] = await Promise.all([
    getLanguage(),
    itemRepository.query({ kind: 'task' }),
    getCachedWeatherData(),
    listRecentFeedHeadlines(now.getTime() - NEWS_WINDOW_MS, NEWS_LIMIT).catch(() => null),
  ]);
  const draft = buildMorningDigest({ now, language, tasks, weather, headlines });
  await itemRepository.create(draft, DIGEST_SOURCE);
}

async function refreshSchedule() {
  const [preferences, current] = await Promise.all([
    browser.storage.local.get(DIGEST_SCHEDULE_KEY),
    browser.alarms.get(DIGEST_ALARM),
  ]);
  if (preferences[DIGEST_SCHEDULE_KEY] !== true) {
    if (current) await browser.alarms.clear(DIGEST_ALARM);
    return;
  }
  const now = new Date();
  const when = nextMorningRunTime(now);
  if (current?.scheduledTime === when) return;

  // Проснувшийся после 07:30 браузер собирает выпуск за текущий день.
  if (now >= morningRunTime(now)) await createMorningDigest(now);
  await browser.alarms.create(DIGEST_ALARM, { when });
}

export function startDigestBackground() {
  // Все запросы на выпуск проходят через один воркер и одну очередь.
  let queue = Promise.resolve();
  function enqueue(action: () => Promise<void>): Promise<boolean> {
    const operation = queue.then(action);
    queue = operation.catch(() => undefined);
    return operation.then(
      () => true,
      () => false,
    );
  }

  function schedule() {
    void enqueue(async () => {
      try {
        await refreshSchedule();
      } catch {
        try {
          await browser.alarms.create(DIGEST_ALARM, { delayInMinutes: 1 });
        } catch {
          console.warn('[DashFlow] Не удалось запланировать утренний дайджест');
        }
      }
    });
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && DIGEST_SCHEDULE_KEY in changes) schedule();
  });
  browser.alarms.onAlarm.addListener(({ name }) => {
    if (name === DIGEST_ALARM) schedule();
  });
  browser.runtime.onInstalled.addListener(schedule);
  browser.runtime.onStartup.addListener(schedule);
  schedule();
  return () => enqueue(() => createMorningDigest(new Date()));
}
