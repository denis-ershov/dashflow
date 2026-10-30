import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageAdapter,
  STORAGE_KEYS,
  collectUserContent,
  restoreUserContent,
  contentKindOf,
  USER_CONTENT_LIMITS,
} from '@/core/storage';

const todo = { id: '1', text: 'Купить хлеб', completed: false, priority: 'medium' };
const habit = { id: 'h1', title: 'Чтение', history: { '2026-10-29': true } };
const link = { id: 'l1', title: 'GitHub', url: 'https://github.com' };

describe('Содержимое виджетов в экспорте', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('распознаёт общие ключи и копии экземпляров, отвергает остальные', () => {
    expect(contentKindOf(STORAGE_KEYS.TODO_ITEMS)).toBe('todos');
    expect(contentKindOf(`${STORAGE_KEYS.NOTES_CONTENT}_notes-1`)).toBe('notes');
    expect(contentKindOf(STORAGE_KEYS.DASHBOARD)).toBeNull();
    expect(contentKindOf(STORAGE_KEYS.PERMISSION_GRANTS)).toBeNull();
    expect(contentKindOf(`${STORAGE_KEYS.TODO_ITEMS}_../x`)).toBeNull();
  });

  it('собирает общие ключи и копии экземпляров, пропуская отсутствующие', async () => {
    await StorageAdapter.set(STORAGE_KEYS.TODO_ITEMS, [todo]);
    await StorageAdapter.set(`${STORAGE_KEYS.NOTES_CONTENT}_notes-1`, '# Привет');

    const snapshot = await collectUserContent(['notes-1', 'todo-1']);

    expect(snapshot).toEqual({
      [STORAGE_KEYS.TODO_ITEMS]: [todo],
      [`${STORAGE_KEYS.NOTES_CONTENT}_notes-1`]: '# Привет',
    });
  });

  it('экспорт → импорт восстанавливает задачи, привычки, заметки и ссылки', async () => {
    await StorageAdapter.set(STORAGE_KEYS.TODO_ITEMS, [todo]);
    await StorageAdapter.set(STORAGE_KEYS.HABIT_ITEMS, [habit]);
    await StorageAdapter.set(STORAGE_KEYS.NOTES_CONTENT, 'заметка');
    await StorageAdapter.set(`${STORAGE_KEYS.QUICK_LINKS}_links-1`, [link]);
    const snapshot = await collectUserContent(['links-1']);

    localStorage.clear();
    const result = await restoreUserContent(JSON.parse(JSON.stringify(snapshot)));

    expect(result.rejected).toEqual([]);
    expect(await StorageAdapter.get(STORAGE_KEYS.TODO_ITEMS, null)).toEqual([todo]);
    expect(await StorageAdapter.get(STORAGE_KEYS.HABIT_ITEMS, null)).toEqual([habit]);
    expect(await StorageAdapter.get(STORAGE_KEYS.NOTES_CONTENT, null)).toBe('заметка');
    expect(await StorageAdapter.get(`${STORAGE_KEYS.QUICK_LINKS}_links-1`, null)).toEqual([link]);
  });

  it('не даёт файлу перезаписать чужие ключи и невалидные данные', async () => {
    const result = await restoreUserContent({
      [STORAGE_KEYS.PERMISSION_GRANTS]: { evil: ['storage'] },
      [STORAGE_KEYS.CUSTOM_PLUGINS]: [{ id: 'x' }],
      [STORAGE_KEYS.TODO_ITEMS]: [{ id: '1', text: 'нет приоритета', completed: false }],
      [STORAGE_KEYS.QUICK_LINKS]: [{ id: 'l', title: 'x', url: 'javascript:alert(1)' }],
      [STORAGE_KEYS.HABIT_ITEMS]: [{ id: 'h', title: 'x', history: { завтра: true } }],
    });

    expect(result.restored).toEqual([]);
    expect(result.rejected).toHaveLength(5);
    expect(await StorageAdapter.get(STORAGE_KEYS.PERMISSION_GRANTS, null)).toBeNull();
    expect(await StorageAdapter.get(STORAGE_KEYS.QUICK_LINKS, null)).toBeNull();
  });

  it('отвергает слишком большие значения', async () => {
    const tooMany = Array.from({ length: USER_CONTENT_LIMITS.maxItems + 1 }, (_, i) => ({
      ...todo,
      id: String(i),
    }));
    const result = await restoreUserContent({
      [STORAGE_KEYS.TODO_ITEMS]: tooMany,
      [STORAGE_KEYS.NOTES_CONTENT]: 'x'.repeat(USER_CONTENT_LIMITS.maxNoteLength + 1),
    });
    expect(result.restored).toEqual([]);
  });

  it('не-объект в файле ничего не восстанавливает', async () => {
    expect(await restoreUserContent(['a'])).toEqual({ restored: [], rejected: [] });
    expect(await restoreUserContent(null)).toEqual({ restored: [], rejected: [] });
  });
});
