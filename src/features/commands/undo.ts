import {
  UndoConflictError,
  commandBus,
  type CommandOutcome,
  type DispatchOptions,
  type Dispatcher,
} from '@/core/commands';
import { t, tp, useI18nStore, type InterpolationParams, type TranslationKey } from '@/core/i18n';
import { crashLogger } from '@/core/observability';
import { toast, useToastStore } from '@/ui/primitives/Toast';

/**
 * Отмена в интерфейсе: тост с кнопкой «Отменить» после заметных действий; горячая клавиша —
 * useUndoHotkey.ts (лёгкий модуль, загружает этот по первому нажатию).
 * Ошибка отмены не теряется — пользователь видит понятное сообщение, разработчик — запись
 * в журнале диагностики.
 */

/** Перевод вне React — на текущем языке интерфейса */
const tr = (key: TranslationKey, params?: InterpolationParams) =>
  t(key, params, useI18nStore.getState().language);

export async function undoLast(
  dispatcher: Dispatcher = commandBus,
  historyId?: number,
): Promise<void> {
  try {
    if (await dispatcher.undo(historyId)) toast.info(tr('commands.undone'));
  } catch (error) {
    if (error instanceof UndoConflictError) {
      toast.warning(tr('commands.undoConflict'));
    } else {
      crashLogger.logError(error, 'storage', { stage: 'undo' });
      toast.error(tr('commands.undoFailed'));
    }
  }
}

/**
 * Выполняет команду и показывает тост с «Отменить» — для удаления, архивации, перемещения,
 * где пользователь может промахнуться. Для частых правок (текст заметки) тост не нужен.
 */
export async function dispatchWithUndoToast<R>(
  type: string,
  payload: unknown,
  options: DispatchOptions = {},
  dispatcher: Dispatcher = commandBus,
): Promise<CommandOutcome<R>> {
  const outcome = await dispatcher.dispatch<R>(type, payload, options);
  if (outcome.historyId !== undefined && outcome.label) {
    showUndoToast(
      tr(outcome.label.key as TranslationKey, outcome.label.params),
      outcome.historyId,
      dispatcher,
    );
  }
  return outcome;
}

export function showUndoToast(
  message: string,
  historyId: number,
  dispatcher: Dispatcher = commandBus,
): void {
  useToastStore.getState().addToast({
    message,
    type: 'success',
    duration: 6000,
    action: { label: tr('commands.undo'), onClick: () => void undoLast(dispatcher, historyId) },
  });
}

/**
 * Удаляет несколько записей одним шагом отмены: «Очистить выполненные» отменяется целиком.
 */
export async function deleteManyWithUndo(
  ids: readonly string[],
  dispatcher: Dispatcher = commandBus,
): Promise<void> {
  if (ids.length === 0) return;
  const outcome = await dispatcher.dispatch<number>('item.deleteMany', { ids });
  if (outcome.historyId !== undefined) {
    showUndoToast(
      tp('commands.deletedMany', outcome.result, undefined, useI18nStore.getState().language),
      outcome.historyId,
      dispatcher,
    );
  }
}
