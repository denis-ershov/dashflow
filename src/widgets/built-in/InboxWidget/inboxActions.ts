import { commandBus } from '@/core/commands';
import { tp, useI18nStore } from '@/core/i18n';
import { itemRepository, type Board, type Item } from '@/core/items';
import { deleteManyWithUndo, dispatchWithUndoToast, showUndoToast } from '@/features/commands/undo';

export type InboxDateField = 'dueAt' | 'remindAt';
export type InboxDialogView = 'actions' | 'move' | InboxDateField;
export type InboxAction =
  | { type: 'archive' | 'delete' }
  | { type: 'move'; boardId: string }
  | { type: InboxDateField; at: string | null };

export const isTaskBoard = (board: Board) =>
  !board.archivedAt && board.columns.some((column) => column.id === 'todo');

export class InboxBoardUnavailableError extends Error {}

async function requireTaskBoard(boardId: string) {
  const board = await itemRepository.getBoard(boardId);
  if (!board || !isTaskBoard(board)) throw new InboxBoardUnavailableError();
}

function commandFor(action: InboxAction, { id, version }: Item) {
  switch (action.type) {
    case 'move':
      return {
        type: 'item.move',
        payload: { id, boardId: action.boardId, status: 'todo', expectedVersion: version },
      };
    case 'archive':
      return { type: 'item.archive', payload: { id, expectedVersion: version } };
    case 'delete':
      return { type: 'item.delete', payload: { id } };
    case 'dueAt':
    case 'remindAt':
      return {
        type: 'item.update',
        payload: { id, expectedVersion: version, patch: { [action.type]: action.at } },
      };
  }
}

const isInbox = (item: Item | undefined): item is Item =>
  item !== undefined && item.status === 'inbox' && !item.archivedAt && !item.deletedAt;

export async function applyInboxAction(action: InboxAction, ids: readonly string[]) {
  const current = await Promise.all(ids.map((id) => itemRepository.get(id)));
  const available = current.filter(isInbox);
  if (available.length === 0) return [];

  if (action.type === 'delete' && ids.length > 1) {
    const ids = available.map(({ id }) => id);
    await deleteManyWithUndo(ids);
    return ids;
  }

  if (action.type === 'move') await requireTaskBoard(action.boardId);
  if (ids.length === 1) {
    const item = available[0];
    if (!item) return [];
    const { type, payload } = commandFor(action, item);
    await dispatchWithUndoToast(type, payload);
    return [item.id];
  }

  const { applied, historyId } = await commandBus.dispatchGroup(
    available.map((item) => commandFor(action, item)),
  );
  const succeeded = applied.flatMap((index) => {
    const item = available[index];
    return item ? [item.id] : [];
  });
  if (historyId !== undefined) {
    showUndoToast(
      tp('inbox.updated', succeeded.length, undefined, useI18nStore.getState().language),
      historyId,
    );
  }
  return succeeded;
}
