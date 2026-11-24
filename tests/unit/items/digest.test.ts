import { describe, expect, it } from 'vitest';
import { buildMorningDigest } from '@/core/digest/morning';
import { morningTag, nextMorningRunTime } from '@/core/digest/model';
import type { Item } from '@/core/items/types';

function task(title: string, dueAt: Date, fields: Partial<Item> = {}): Item {
  return {
    id: title,
    kind: 'task',
    title,
    status: 'todo',
    order: 'a0',
    dueAt: dueAt.toISOString(),
    tags: [],
    source: { type: 'user', id: 'local', name: 'local' },
    createdAt: dueAt.toISOString(),
    updatedAt: dueAt.toISOString(),
    version: 1,
    ...fields,
  };
}

describe('Утренний дайджест', () => {
  const now = new Date(2026, 10, 23, 7, 30);

  it('берёт открытые задачи с местной полуночи, погоду и только свежие ссылки', () => {
    const digest = buildMorningDigest({
      now,
      language: 'en',
      tasks: [
        task('Позже', new Date(2026, 10, 23, 23, 59)),
        task('Первым делом', new Date(2026, 10, 23)),
        task('Вчера', new Date(2026, 10, 22, 23, 59)),
        task('Завтра', new Date(2026, 10, 24)),
        task('Готово', now, { status: 'done' }),
        task('Удалено', now, { deletedAt: now.toISOString() }),
      ],
      weather: { city: 'Москва', temperature: -3 },
      headlines: [
        { title: 'Новость [выпуск]', link: 'https://example.com/news(a)', timestamp: +now },
        { title: 'Будущее', link: 'https://example.com/future', timestamp: +now + 1 },
        { title: 'Старое', link: 'https://example.com/old', timestamp: +now - 86_400_001 },
        { title: 'Вредоносная ссылка', link: 'javascript:alert(1)', timestamp: +now - 500 },
      ],
    });

    expect(digest).toMatchObject({ kind: 'digest', status: 'unread', tags: [morningTag(now)] });
    expect(digest.title).toBe('Morning · November 23, 2026');
    expect(digest.body).toContain('Москва · -3°C');
    expect(digest.body).toContain('- Первым делом\n- Позже');
    expect(digest.body).toContain('- [Новость \\[выпуск\\]](<https://example.com/news(a)>)');
    expect(digest.body).toContain('- Вредоносная ссылка');
    expect(digest.body).not.toMatch(/Вчера|Завтра|Готово|Удалено|Будущее|Старое|javascript/);
  });

  it('показывает понятный результат, когда кеши пусты', () => {
    const { body } = buildMorningDigest({
      now,
      language: 'ru',
      tasks: [],
      weather: null,
      headlines: [],
    });
    expect(body).toContain('Пока нет сохранённых данных о погоде.');
    expect(body).toContain('На сегодня нет открытых задач.');
    expect(body).toContain('В кеше лент нет свежих новостей.');
  });

  it('планирует на ближайшие 07:30 по местному времени', () => {
    expect(nextMorningRunTime(new Date(2026, 10, 23, 7, 29))).toBe(now.getTime());
    expect(nextMorningRunTime(now)).toBe(new Date(2026, 10, 24, 7, 30).getTime());
    expect(nextMorningRunTime(new Date(2026, 11, 31, 23, 59))).toBe(
      new Date(2027, 0, 1, 7, 30).getTime(),
    );
  });
});
