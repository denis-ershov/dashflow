import { describe, it, expect } from 'vitest';
import {
  ITEM_LIMITS,
  ItemValidationError,
  parseBoardDraft,
  parseItemDraft,
  parseItemPatch,
} from '@/core/items/validation';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof ItemValidationError ? error.code : 'other';
  }
  return 'ok';
};

describe('Проверка черновика Item', () => {
  it('принимает минимальный и полный черновик, нормализует поля', () => {
    expect(parseItemDraft({ kind: 'task', title: '  Купить хлеб ' })).toEqual({
      kind: 'task',
      title: 'Купить хлеб',
    });
    const full = parseItemDraft({
      kind: 'link',
      title: 'Документация',
      url: 'https://wxt.dev',
      body: '# Markdown',
      status: 'todo',
      boardId: 'board_1',
      priority: 'high',
      dueAt: '2026-11-01T10:00:00+03:00',
      tags: ['работа', 'работа', ' docs '],
      pinned: true,
    });
    expect(full.dueAt).toBe('2026-11-01T07:00:00.000Z');
    expect(full.tags).toEqual(['работа', 'docs']);
  });

  it.each([
    [null, 'not-object'],
    [[], 'not-object'],
    [{ kind: 'spam', title: 'x' }, 'kind'],
    [{ kind: 'task' }, 'title'],
    [{ kind: 'task', title: '   ' }, 'title'],
    [{ kind: 'task', title: 'x'.repeat(ITEM_LIMITS.titleLength + 1) }, 'title'],
    [{ kind: 'note', title: 'x', body: 'x'.repeat(ITEM_LIMITS.bodyLength + 1) }, 'body'],
    [{ kind: 'link', title: 'x', url: 'javascript:alert(1)' }, 'url'],
    [{ kind: 'task', title: 'x', status: 'с пробелом' }, 'status'],
    [{ kind: 'task', title: 'x', boardId: '../etc' }, 'board'],
    [{ kind: 'task', title: 'x', order: 'bad!' }, 'order'],
    [{ kind: 'task', title: 'x', priority: 'urgent' }, 'priority'],
    [{ kind: 'task', title: 'x', dueAt: 'завтра' }, 'date'],
    [{ kind: 'task', title: 'x', tags: Array(ITEM_LIMITS.tags + 1).fill('t') }, 'tags'],
    [{ kind: 'task', title: 'x', tags: [42] }, 'tags'],
    [{ kind: 'task', title: 'x', pinned: 'yes' }, 'flag'],
  ])('отвергает %j с кодом %s', (input, code) => {
    expect(codeOf(() => parseItemDraft(input))).toBe(code);
  });
});

describe('Проверка изменения Item', () => {
  it('null очищает допустимые поля, отсутствующие ключи не трогаются', () => {
    expect(parseItemPatch({ dueAt: null, title: 'Новое', archivedAt: null })).toEqual({
      title: 'Новое',
      dueAt: null,
      archivedAt: null,
    });
  });

  it('пустой заголовок в изменении недопустим', () => {
    expect(codeOf(() => parseItemPatch({ title: '' }))).toBe('title');
  });
});

describe('Проверка доски', () => {
  it('принимает колонки и отвергает повторяющиеся id', () => {
    expect(
      parseBoardDraft({
        title: 'Работа',
        columns: [{ id: 'todo', title: 'Сделать', wipLimit: 3 }],
      }),
    ).toEqual({ title: 'Работа', columns: [{ id: 'todo', title: 'Сделать', wipLimit: 3 }] });
    expect(
      codeOf(() =>
        parseBoardDraft({
          title: 'x',
          columns: [
            { id: 'a', title: 'A' },
            { id: 'a', title: 'B' },
          ],
        }),
      ),
    ).toBe('columns');
    expect(codeOf(() => parseBoardDraft({ title: 'x', columns: [] }))).toBe('columns');
  });
});
