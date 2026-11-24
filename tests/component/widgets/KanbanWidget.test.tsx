import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useI18nStore } from '@/core/i18n';
import { itemRepository, type ItemDraft, type ItemSource } from '@/core/items';
import { KanbanWidget, type KanbanSettings } from '@/widgets/built-in/KanbanWidget/KanbanWidget';
import { resetWorkspace } from '../../helpers/workspace';

const source: ItemSource = { type: 'user', id: 'local', name: 'local' };
const columns = [
  { id: 'todo', title: 'Запланировано' },
  { id: 'doing', title: 'В работе', wipLimit: 1 },
  { id: 'done', title: 'Готово' },
];
const createBoard = (title = 'Моя доска') => itemRepository.createBoard({ title, columns });
const createCard = (draft: Omit<ItemDraft, 'kind'>) =>
  itemRepository.create({ kind: 'task', ...draft }, source);

function TestKanban({ initialBoardId }: { initialBoardId?: string }) {
  const [settings, setSettings] = useState<KanbanSettings>({ boardId: initialBoardId });
  return (
    <KanbanWidget instanceId="kanban-test" settings={settings} onUpdateSettings={setSettings} />
  );
}
const visibleTitles = (column: string) =>
  within(screen.getByRole('region', { name: column }))
    .getAllByRole('listitem')
    .map(
      (item) =>
        within(item).getByRole('button', { expanded: undefined, name: /^[^«]+$/ }).textContent,
    );

describe('KanbanWidget', () => {
  beforeEach(async () => {
    await resetWorkspace([]);
    useI18nStore.getState().setLanguage('ru');
  });

  it('загружает активные доски и обновляет выбор после архивации', async () => {
    const first = await createBoard();
    const second = await createBoard('Другая доска');
    await createCard({ title: 'Первая карточка', boardId: first.id, status: 'todo' });
    await createCard({ title: 'Вторая карточка', boardId: second.id, status: 'done' });
    render(<TestKanban initialBoardId={second.id} />);
    expect(await screen.findByRole('button', { name: 'Вторая карточка' })).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Доска' }), {
      target: { value: first.id },
    });
    expect(await screen.findByRole('button', { name: 'Первая карточка' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Вторая карточка' })).toBeNull();

    await act(async () => {
      await itemRepository.setBoardArchived(first.id, true);
    });
    expect(await screen.findByRole('button', { name: 'Вторая карточка' })).toBeVisible();
  });

  it('показывает пустое состояние без активных досок', async () => {
    render(<TestKanban />);
    expect(await screen.findByText('Нет активных досок')).toBeVisible();
  });

  it('переставляет карточки и перемещает в пустую колонку с клавиатуры', async () => {
    const board = await createBoard();
    const first = await createCard({ title: 'Первая', boardId: board.id, status: 'todo' });
    await createCard({ title: 'Вторая', boardId: board.id, status: 'todo' });
    render(<TestKanban />);
    const user = userEvent.setup();
    const handle = await screen.findByRole('button', { name: 'Перетащить «Первая»' });
    handle.focus();
    await user.keyboard('[Space][ArrowDown][Space]');
    await waitFor(() => expect(visibleTitles('Запланировано')).toEqual(['Вторая', 'Первая']));
    expect(handle).toHaveFocus();

    await user.keyboard('[Space][ArrowRight]');
    expect(screen.getByText(/колонка «В работе», позиция 1/)).toHaveAttribute('role', 'status');
    await user.keyboard('[Space]');
    await waitFor(() => expect(visibleTitles('В работе')).toEqual(['Первая']));
    expect(screen.getByRole('button', { name: 'Перетащить «Первая»' })).toHaveFocus();
    expect(await itemRepository.get(first.id)).toMatchObject({
      status: 'doing',
      boardId: board.id,
    });
  });

  it('отменяет перенос и объявляет результат по-английски', async () => {
    useI18nStore.getState().setLanguage('en');
    const board = await createBoard('Workspace');
    const item = await createCard({ title: 'Plan', boardId: board.id, status: 'todo' });
    render(<TestKanban />);
    const user = userEvent.setup();
    const handle = await screen.findByRole('button', { name: 'Drag Plan' });
    handle.focus();
    await user.keyboard('[Space][ArrowRight][Escape]');
    expect(screen.getByText('Move cancelled.')).toHaveAttribute('role', 'status');
    expect(handle).toHaveFocus();
    expect(handle).toHaveAttribute('aria-pressed', 'false');
    expect(await itemRepository.get(item.id)).toMatchObject({ status: 'todo', version: 1 });
  });

  it('показывает метаданные и безопасный Markdown, переносит из панели с предупреждением WIP', async () => {
    const board = await createBoard();
    const item = await createCard({
      title: 'Исследование',
      body: '## Следующий шаг\n- [ ] Проверить отчёт\n<img src=x onerror=alert(1)>',
      boardId: board.id,
      status: 'todo',
      tags: ['отчёт'],
      priority: 'high',
      dueAt: '2020-01-01T09:00:00.000Z',
    });
    await createCard({ title: 'Другая задача', boardId: board.id, status: 'doing' });
    render(<TestKanban />);
    const column = await screen.findByRole('region', { name: 'Запланировано' });
    expect(within(column).getByText(/Просрочено с/)).toHaveClass('text-danger');
    expect(within(column).getByText('Высокий приоритет')).toBeVisible();
    expect(within(column).getByText('отчёт')).toBeVisible();

    fireEvent.click(within(column).getByRole('button', { name: 'Исследование' }));
    const dialog = screen.getByRole('dialog', { name: 'Сведения о карточке' });
    const panel = within(dialog);
    expect(panel.getByRole('heading', { name: 'Следующий шаг' })).toBeVisible();
    expect(panel.getByText('Проверить отчёт')).toBeVisible();
    expect(panel.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
    expect(dialog.querySelector('img')).toBeNull();
    fireEvent.change(panel.getByRole('combobox', { name: 'Колонка назначения' }), {
      target: { value: 'doing' },
    });
    fireEvent.click(panel.getByRole('button', { name: 'Переместить' }));
    expect(await screen.findByText('Лимит превышен (2 из 1)')).toBeVisible();
    expect(panel.getByRole('status')).toHaveTextContent('Лимит карточек в колонке превышен.');
    expect(await itemRepository.get(item.id)).toMatchObject({ status: 'doing' });
  });

  it('сворачивает колонки и показывает карточки со старым статусом', async () => {
    const board = await createBoard();
    await createCard({ title: 'Задача', boardId: board.id, status: 'todo' });
    await createCard({ title: 'Из импорта', boardId: board.id, status: 'legacy' });
    render(<TestKanban />);
    const collapse = await screen.findByRole('button', { name: 'Свернуть колонку Запланировано' });
    fireEvent.click(collapse);
    expect(screen.queryByRole('button', { name: 'Задача' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Развернуть колонку Запланировано' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(screen.getByRole('region', { name: 'Неизвестный статус (legacy)' })).getByRole(
        'button',
        { name: 'Из импорта' },
      ),
    ).toBeVisible();
  });
});
