import { describe, it, expect } from 'vitest';
import { cn } from '@/ui/lib/cn';

describe('cn', () => {
  it('объединяет классы и отбрасывает ложные значения', () => {
    expect(cn('a', false, null, undefined, '', 'c')).toBe('a c');
  });

  it('разрешает конфликт утилит Tailwind в пользу последней', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('не склеивает утилиты из разных групп', () => {
    expect(cn('p-2', 'mt-4')).toBe('p-2 mt-4');
  });

  it('на пустом входе возвращает пустую строку', () => {
    expect(cn()).toBe('');
  });
});
