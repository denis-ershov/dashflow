import { describe, expect, it } from 'vitest';
import { parseQuickCapture } from '@/core/items/quickParse';
import { ITEM_LIMITS, ItemValidationError } from '@/core/items/validation';

describe('Быстрый ввод Inbox', () => {
  const now = new Date(2026, 11, 31, 15, 30);

  it('разбирает русский срок, теги и приоритет, переходя через границу года', () => {
    expect(parseQuickCapture('  Позвонить завтра 9:30 #работа ! #работа  ', { now })).toEqual({
      title: 'Позвонить',
      tags: ['работа'],
      priority: 'high',
      dueAt: new Date(2027, 0, 1, 9, 30).toISOString(),
    });
  });

  it('распознаёт английский срок без времени и сохраняет пунктуацию заголовка', () => {
    expect(parseQuickCapture('Draft plan! TODAY #Road-map', { now, locale: 'en' })).toEqual({
      title: 'Draft plan!',
      tags: ['Road-map'],
      dueAt: new Date(2026, 11, 31, 23, 59).toISOString(),
      priority: undefined,
    });
  });

  it('сохраняет обычное время и идентификаторы внутри заголовка', () => {
    expect(parseQuickCapture('Read C# at 10:00', { locale: 'en' })).toMatchObject({
      title: 'Read C# at 10:00',
      tags: [],
    });
  });

  it.each(['#важное !', 'Задача завтра 25:00', 'Задача завтра 9:7', 'Задача завтра сегодня'])(
    'отклоняет неполный или противоречивый ввод %s',
    (input) => expect(() => parseQuickCapture(input, { now })).toThrow(ItemValidationError),
  );

  it('соблюдает лимиты заголовков и тегов из модели Item', () => {
    expect(() => parseQuickCapture('x'.repeat(ITEM_LIMITS.titleLength + 1))).toThrow(
      ItemValidationError,
    );
    expect(() => parseQuickCapture(`Задача #${'x'.repeat(ITEM_LIMITS.tagLength + 1)}`)).toThrow(
      ItemValidationError,
    );
  });
});
