import { ItemValidationError, parseItemDraft, ITEM_LIMITS } from './validation';

const RELATIVE_DAY = {
  ru: { today: /^сегодня$/iu, tomorrow: /^завтра$/iu },
  en: { today: /^today$/i, tomorrow: /^tomorrow$/i },
};
const TAG = /^#([\p{L}\p{M}\p{N}_-]+)$/u;
const TIME_LIKE = /^\d+:\d+$/;
const TIME = /^(\d{1,2}):(\d{2})$/;
/** Верхняя граница ввода с учётом метаданных. Основные лимиты проверяет parseItemDraft. */
export const QUICK_CAPTURE_LIMIT =
  ITEM_LIMITS.titleLength + ITEM_LIMITS.tags * (ITEM_LIMITS.tagLength + 2) + 24;

export interface QuickCapture {
  title: string;
  tags: string[];
  dueAt?: string;
  priority?: 'high';
}

function parseDueAt(now: Date, dayOffset: number, time?: string): string {
  const match = time && TIME.exec(time);
  const hour = match ? Number(match[1]) : 23;
  const minute = match ? Number(match[2]) : 59;
  if ((time && !match) || hour > 23 || minute > 59 || !Number.isFinite(now.getTime())) {
    throw new ItemValidationError('date', 'dueAt');
  }

  const due = new Date(now);
  due.setDate(now.getDate() + dayOffset);
  due.setHours(hour, minute, 0, 0);
  // В день перевода часов местное время может отсутствовать.
  if (due.getHours() !== hour || due.getMinutes() !== minute) {
    throw new ItemValidationError('date', 'dueAt');
  }
  return due.toISOString();
}

export function parseQuickCapture(
  input: string,
  { now = new Date(), locale = 'ru' }: { now?: Date; locale?: 'ru' | 'en' } = {},
): QuickCapture {
  if (input.length > QUICK_CAPTURE_LIMIT) throw new ItemValidationError('title', 'title');

  const tokens = input.trim().split(/\s+/u);
  const words: string[] = [];
  const tags: string[] = [];
  let priority: QuickCapture['priority'];
  let dueAt: string | undefined;
  const days = RELATIVE_DAY[locale];

  for (let position = 0; position < tokens.length; position++) {
    const token = tokens[position] ?? '';
    const tag = TAG.exec(token)?.[1];
    const dayOffset = days.today.test(token) ? 0 : days.tomorrow.test(token) ? 1 : undefined;
    if (tag) {
      tags.push(tag.normalize('NFC'));
    } else if (token === '!') {
      priority = 'high';
    } else if (dayOffset !== undefined) {
      if (dueAt) throw new ItemValidationError('date', 'dueAt');
      const candidate = tokens[position + 1];
      const time = candidate && TIME_LIKE.test(candidate) ? candidate : undefined;
      dueAt = parseDueAt(now, dayOffset, time);
      if (time) position++;
    } else {
      words.push(token);
    }
  }

  const validated = parseItemDraft({
    kind: 'task',
    title: words.join(' '),
    tags: [...new Set(tags)],
    priority,
    dueAt,
  });
  return { title: validated.title, tags: validated.tags ?? [], dueAt: validated.dueAt, priority };
}
