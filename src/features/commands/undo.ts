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

export async function undoLast(dispatcher: Dispatcher = commandBus): Promise<void> {
  try {
    if (await dispatcher.undo()) toast.info(tr('commands.undone'));
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
  if (outcome.undo && outcome.label) {
    useToastStore.getState().addToast({
      message: tr(outcome.label.key as TranslationKey, outcome.label.params),
      type: 'success',
      duration: 6000,
      action: { label: tr('commands.undo'), onClick: () => void undoLast(dispatcher) },
    });
  }
  return outcome;
}

/** Тост «Отменить» для серии действий, склеенной в истории в один шаг (coalesceKey) */
export function showUndoToast(message: string, dispatcher: Dispatcher = commandBus): void {
  useToastStore.getState().addToast({
    message,
    type: 'success',
    duration: 6000,
    action: { label: tr('commands.undo'), onClick: () => void undoLast(dispatcher) },
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
  const coalesceKey = `delete-many-${Date.now()}`;
  for (const id of ids) await dispatcher.dispatch('item.delete', { id }, { coalesceKey });
  showUndoToast(
    tp('commands.deletedMany', ids.length, undefined, useI18nStore.getState().language),
    dispatcher,
  );
}
