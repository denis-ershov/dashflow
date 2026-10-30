import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LINK_STATUS,
  NOTE_STATUS,
  convertLegacyContent,
  createItemRepository,
  noteTitleFrom,
  runLegacyMigration,
  type ItemRepository,
  type LegacyLabels,
} from '@/core/items';
import { STORAGE_KEYS } from '@/core/storage/keys';

const labels: LegacyLabels = {
  tasks: 'Задачи',
  todoColumn: 'Сделать',
  doneColumn: 'Готово',
  links: 'Ссылки',
  note: 'Заметка',
};
const source = { type: 'import', id: 'legacy-3-8', name: '3.8' } as const;
const now = new Date('2026-10-30T12:00:00.000Z');

const TODO = STORAGE_KEYS.TODO_ITEMS;
const NOTES = STORAGE_KEYS.NOTES_CONTENT;
const LINKS = STORAGE_KEYS.QUICK_LINKS;

const todos = [
  { id: '2', text: 'Позвонить', completed: false, priority: 'high', createdAt: 1_761_800_000_000 },
  { id: '1', text: 'Купить хлеб', completed: true, priority: 'low' },
];
const links = [
  { id: 'l1', title: 'GitHub', url: 'https://github.com' },
  { id: 'l2', title: '', url: 'https://wxt.dev' },
];

describe('Конвертер содержимого 3.8', () => {
  it('пустой профиль ничего не создаёт', () => {
    const result = convertLegacyContent({
      snapshot: {},
      instances: [{ instanceId: 'todo-1', widgetId: 'todo' }],
      labels,
      source,
      now,
    });
    expect(result).toEqual({ items: [], boards: [], mapping: {}, skipped: 0 });
  });

  it('один экземпляр каждого виджета: доски, записи и привязка', () => {
    const result = convertLegacyContent({
      snapshot: { [TODO]: todos, [NOTES]: '# Планы\n- [x] сделать', [LINKS]: links },
      instances: [
        { instanceId: 'todo-1', widgetId: 'todo' },
        { instanceId: 'notes-1', widgetId: 'notes' },
        { instanceId: 'links-1', widgetId: 'quickLinks' },
        { instanceId: 'clock-1', widgetId: 'clock' },
      ],
      labels,
      source,
      now,
    });

    const tasks = result.items.filter((item) => item.kind === 'task');
    expect(tasks.map((task) => [task.title, task.status, task.priority])).toEqual([
      ['Позвонить', 'todo', 'high'],
      ['Купить хлеб', 'done', 'low'],
    ]);
    expect(tasks[0]!.order < tasks[1]!.order).toBe(true); // порядок списка сохранён
    expect(tasks[0]!.createdAt).toBe(new Date(1_761_800_000_000).toISOString());

    const note = result.items.find((item) => item.kind === 'note');
    expect(note).toMatchObject({
      title: 'Планы',
      status: NOTE_STATUS,
      body: '# Планы\n- [x] сделать',
    });

    const savedLinks = result.items.filter((item) => item.kind === 'link');
    expect(savedLinks.map((link) => [link.title, link.status])).toEqual([
      ['GitHub', LINK_STATUS],
      ['https://wxt.dev', LINK_STATUS],
    ]);

    expect(result.boards.map((board) => board.title)).toEqual(['Задачи', 'Ссылки']);
    expect(result.mapping['todo-1']?.boardId).toBe(result.boards[0]?.id);
    expect(result.mapping['notes-1']?.itemId).toBe(note?.id);
    expect(result.mapping['clock-1']).toBeUndefined();
  });

  it('несколько экземпляров: своя копия важнее общего ключа', () => {
    const result = convertLegacyContent({
      snapshot: {
        [TODO]: todos,
        [`${TODO}_todo-2`]: [{ id: 'x', text: 'Своё', completed: false, priority: 'medium' }],
      },
      instances: [
        { instanceId: 'todo-1', widgetId: 'todo' },
        { instanceId: 'todo-2', widgetId: 'todo' },
      ],
      labels,
      source,
      now,
    });
    const titlesOn = (boardId?: string) =>
      result.items.filter((item) => item.boardId === boardId).map((item) => item.title);
    expect(titlesOn(result.mapping['todo-1']?.boardId)).toEqual(['Позвонить', 'Купить хлеб']);
    expect(titlesOn(result.mapping['todo-2']?.boardId)).toEqual(['Своё']);
  });

  it('битые данные пропускаются, остальное переносится', () => {
    const result = convertLegacyContent({
      snapshot: {
        [TODO]: [{ id: '1', text: 'нет приоритета', completed: false }],
        [LINKS]: [{ id: 'l', title: 'x', url: 'javascript:alert(1)' }],
        [NOTES]: 'нормальная заметка',
      },
      instances: [
        { instanceId: 'todo-1', widgetId: 'todo' },
        { instanceId: 'links-1', widgetId: 'quickLinks' },
        { instanceId: 'notes-1', widgetId: 'notes' },
      ],
      labels,
      source,
      now,
    });
    expect(result.skipped).toBe(2);
    expect(result.items.map((item) => item.kind)).toEqual(['note']);
  });

  it('содержимое удалённого виджета уходит в архив', () => {
    const result = convertLegacyContent({
      snapshot: { [LINKS]: links },
      instances: [],
      labels,
      source,
      now,
    });
    expect(result.boards[0]?.archivedAt).toBe(now.toISOString());
    expect(result.items.every((item) => item.archivedAt === now.toISOString())).toBe(true);
  });

  it('заголовок заметки — первая содержательная строка без разметки', () => {
    expect(noteTitleFrom('\n\n## Идеи проекта\nтекст', 'Заметка')).toBe('Идеи проекта');
    expect(noteTitleFrom('- [ ] купить', 'Заметка')).toBe('купить');
    expect(noteTitleFrom('   ', 'Заметка')).toBe('Заметка');
  });
});

describe('Миграция при запуске', () => {
  let repo: ItemRepository;
  let counter = 0;
  beforeEach(() => {
    repo = createItemRepository({ dbName: `migration-${++counter}` });
  });
  afterEach(async () => {
    await repo.close();
  });

  const instances = [
    { instanceId: 'todo-1', widgetId: 'todo' },
    { instanceId: 'notes-1', widgetId: 'notes' },
  ];

  it('переносит данные один раз: повторный запуск ничего не дублирует', async () => {
    const readSnapshot = vi.fn(async () => ({ [TODO]: todos, [NOTES]: 'заметка' }));

    const first = await runLegacyMigration({
      repository: repo,
      instances,
      labels,
      now,
      readSnapshot,
    });
    expect(first).toMatchObject({ items: 3, boards: 1, skipped: 0 });
    expect(await repo.query({ includeArchived: true })).toHaveLength(3);

    const second = await runLegacyMigration({
      repository: repo,
      instances,
      labels,
      now,
      readSnapshot,
    });
    expect(second).toEqual(first);
    expect(readSnapshot).toHaveBeenCalledTimes(1);
    expect(await repo.query({ includeArchived: true })).toHaveLength(3);
  });

  it('ошибка записи не оставляет ни данных, ни маркера — следующий запуск повторит', async () => {
    const broken = vi
      .spyOn(repo, 'importBatch')
      .mockRejectedValueOnce(new Error('QuotaExceededError'));
    const readSnapshot = async () => ({ [TODO]: todos });

    await expect(
      runLegacyMigration({ repository: repo, instances, labels, now, readSnapshot }),
    ).rejects.toThrow('QuotaExceededError');
    expect(await repo.getMeta('legacyMigration')).toBeUndefined();

    broken.mockRestore();
    const record = await runLegacyMigration({
      repository: repo,
      instances,
      labels,
      now,
      readSnapshot,
    });
    expect(record.items).toBe(2);
  });

  it('невалидная запись отменяет всю пачку (транзакция)', async () => {
    await expect(
      repo.importBatch({
        items: [{ id: 'bad', kind: 'task' }],
        boards: [],
        source,
        meta: { key: 'legacyMigration', value: {} },
      }),
    ).rejects.toThrow();
    expect(await repo.getMeta('legacyMigration')).toBeUndefined();
  });
});
