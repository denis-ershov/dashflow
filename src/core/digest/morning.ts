import { formatDate, formatNumber, t } from '@/core/i18n/i18n';
import type { SupportedLanguage } from '@/core/i18n/types';
import type { Item, ItemDraft } from '@/core/items/types';
import { isSafeHttpUrl } from '@/core/network/url';
import { DIGEST_UNREAD, morningTag } from './model';

export const NEWS_LIMIT = 8;
export const NEWS_WINDOW_MS = 24 * 60 * 60 * 1_000;
const TASK_LIMIT = 30;

interface MorningInput {
  now: Date;
  language: SupportedLanguage;
  tasks: readonly Item[];
  weather: { city: string; temperature: number } | null;
  headlines: readonly { title: string; link: string; timestamp: number }[] | null;
}

function inlineText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\[\]]/g, '\\$&');
}

function getTodayTasks(tasks: readonly Item[], now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const startAt = start.getTime();
  const endAt = end.getTime();
  return tasks
    .flatMap((task) => {
      if (task.kind !== 'task' || task.status === 'done' || task.archivedAt || task.deletedAt) {
        return [];
      }
      const due = Date.parse(task.dueAt ?? '');
      return due >= startAt && due < endAt ? [{ task, due }] : [];
    })
    .sort((left, right) => left.due - right.due);
}

function headlineLine(title: string, link: string) {
  const label = inlineText(title);
  if (!isSafeHttpUrl(link) || link.length > 2_048) return `- ${label}`;
  const url = new URL(link).href.replace(/[<>]/g, (character) => encodeURIComponent(character));
  return `- [${label}](<${url}>)`;
}

export function buildMorningDigest({
  now,
  language,
  tasks,
  weather,
  headlines,
}: MorningInput): ItemDraft {
  const label = (key: Parameters<typeof t>[0], params?: Parameters<typeof t>[1]) =>
    t(key, params, language);
  const today = getTodayTasks(tasks, now);
  const taskLines = today.slice(0, TASK_LIMIT).map(({ task }) => `- ${inlineText(task.title)}`);
  if (!taskLines.length) taskLines.push(label('digest.morning.tasksEmpty'));
  if (today.length > TASK_LIMIT) {
    taskLines.push(
      label('digest.morning.tasksOverflow', {
        limit: formatNumber(TASK_LIMIT, undefined, language),
      }),
    );
  }
  const weatherLine =
    weather && typeof weather.city === 'string' && Number.isFinite(weather.temperature)
      ? label('digest.morning.weatherValue', {
          city: inlineText(weather.city.slice(0, 500)),
          temperature: formatNumber(
            weather.temperature,
            { style: 'unit', unit: 'celsius' },
            language,
          ),
        })
      : label('digest.morning.weatherMissing');
  const timestamp = now.getTime();
  const newsLines = headlines
    ?.filter(
      (headline) =>
        headline.timestamp >= timestamp - NEWS_WINDOW_MS && headline.timestamp <= timestamp,
    )
    .slice(0, NEWS_LIMIT)
    .map(({ title, link }) => headlineLine(title.slice(0, 500), link));
  return {
    kind: 'digest',
    status: DIGEST_UNREAD,
    tags: [morningTag(now)],
    title: label('digest.morning.title', {
      date: formatDate(now, { dateStyle: 'long' }, language),
    }),
    body: [
      `## ${label('digest.morning.weather')}`,
      weatherLine,
      '',
      `## ${label('digest.morning.tasks')}`,
      ...taskLines,
      '',
      `## ${label('digest.morning.news')}`,
      ...(newsLines?.length
        ? newsLines
        : [label(headlines ? 'digest.morning.newsEmpty' : 'digest.morning.newsUnavailable')]),
    ].join('\n'),
  };
}
