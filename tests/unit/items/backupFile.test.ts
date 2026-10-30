import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createItemRepository, runLegacyMigration, type ItemRepository } from '@/core/items';
import { STORAGE_KEYS } from '@/core/storage/keys';
import {
  applyItemsMapping,
  exportWorkspaceItems,
  importWorkspaceItems,
  legacyLabels,
} from '@/features/settings/backupFile';

const user = { type: 'user', id: 'local', name: 'local' } as const;
const instances = [
  { instanceId: 'todo-1', widgetId: 'todo', settings: { filter: 'all' } },
  { instanceId: 'notes-1', widgetId: 'notes', settings: {} },
];

let repo: ItemRepository;
let counter = 0;
beforeEach(() => {
  repo = createItemRepository({ dbName: `backup-${++counter}` });
});
afterEach(async () => {
  await repo.close();
});

describe('Файл экспорта: содержимое рабочего пространства', () => {
  it('экспорт 3.0 → импорт в чистый профиль восстанавливает записи и доски', async () => {
    const board = await repo.createBoard({ title: 'Работа' });
    await repo.create({ kind: 'task', title: 'Отчёт', boardId: board.id, status: 'todo' }, user);
    const deleted = await repo.create({ kind: 'note', title: 'В корзине' }, user);
    await repo.remove(deleted.id, user);
    const exported = await exportWorkspaceItems(repo);
    expect(exported.items.map((item) => item.title)).toEqual(['Отчёт']); // корзина не экспортируется

    const target = createItemRepository({ dbName: `backup-target-${counter}` });
    const file = JSON.parse(JSON.stringify({ version: '3.0', ...exported })) as Record<
      string,
      unknown
    >;
    const result = await importWorkspaceItems({
      file,
      repository: target,
      instances: [],
      language: 'ru',
    });

    expect(result).toMatchObject({ items: 1, boards: 1 });
    expect((await target.query()).map((item) => item.title)).toEqual(['Отчёт']);
    expect((await target.listBoards()).map((b) => b.title)).toEqual(['Работа']);
    // Маркер: восстановленные старые ключи не будут повторно перенесены при запуске
    expect(await target.getMeta('legacyMigration')).toBeDefined();
    await target.close();
  });

  it('импорт 2.2 переносит content в Item и привязывает экземпляры виджетов', async () => {
    const file = {
      version: '2.2',
      content: {
        [STORAGE_KEYS.TODO_ITEMS]: [
          { id: '1', text: 'Купить хлеб', completed: false, priority: 'medium' },
        ],
        [`${STORAGE_KEYS.NOTES_CONTENT}_notes-1`]: '# Идеи',
      },
    };
    const result = await importWorkspaceItems({
      file,
      repository: repo,
      instances,
      language: 'en',
    });

    expect(result.items).toBe(2);
    expect((await repo.listBoards())[0]?.title).toBe('Tasks'); // подписи — на языке интерфейса

    const linked = applyItemsMapping(instances, result.mapping);
    expect(linked[0]?.settings).toMatchObject({ filter: 'all', boardId: expect.any(String) });
    expect(linked[1]?.settings).toMatchObject({ itemId: expect.any(String) });
  });

  it('импорт после миграции дополняет записи, а не заменяет маркер', async () => {
    await runLegacyMigration({
      repository: repo,
      instances,
      labels: legacyLabels('ru'),
      readSnapshot: async () => ({ [STORAGE_KEYS.NOTES_CONTENT]: 'старая заметка' }),
    });
    await importWorkspaceItems({
      file: {
        content: {
          [STORAGE_KEYS.TODO_ITEMS]: [{ id: '1', text: 'x', completed: false, priority: 'low' }],
        },
      },
      repository: repo,
      instances,
      language: 'ru',
    });
    const marker = (await repo.getMeta('legacyMigration')) as { mapping: Record<string, unknown> };
    expect(Object.keys(marker.mapping).sort()).toEqual(['notes-1', 'todo-1']);
    expect(await repo.query({ includeArchived: true })).toHaveLength(2);
  });

  it('файл с поддельной записью отклоняется целиком', async () => {
    const file = {
      items: [
        {
          id: 'x1',
          kind: 'link',
          title: 'фишинг',
          url: 'javascript:alert(1)',
          status: 'saved',
          order: 'a0',
          tags: [],
          source: { type: 'user', id: 'local', name: 'local' },
          createdAt: '2026-10-30T00:00:00.000Z',
          updatedAt: '2026-10-30T00:00:00.000Z',
          version: 1,
        },
      ],
      boards: [],
    };
    await expect(
      importWorkspaceItems({ file, repository: repo, instances: [], language: 'ru' }),
    ).rejects.toThrow();
    expect(await repo.query()).toEqual([]);
  });
});
