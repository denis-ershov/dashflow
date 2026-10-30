import { useEffect } from 'react';
import type { Dispatcher } from '@/core/commands';

/**
 * Ctrl+Z / Cmd+Z вне полей ввода отменяет последнее действие с данными.
 * Модуль намеренно лёгкий: командная шина и хранилище загружаются по первому нажатию,
 * а не в главный чанк новой вкладки. Если команд ещё не было, отменять нечего.
 */

function isTextEditing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && !['checkbox', 'radio', 'button'].includes(target.type))
  );
}

async function undoWith(dispatcher?: Dispatcher): Promise<void> {
  const { undoLast } = await import('./undo');
  if (dispatcher) {
    if (dispatcher.canUndo()) await undoLast(dispatcher);
    return;
  }
  const { commandBus } = await import('@/core/commands');
  if (commandBus.canUndo()) await undoLast(commandBus);
}

/** dispatcher — для тестов; по умолчанию — commandBus, загружаемый лениво */
export function useUndoHotkey(dispatcher?: Dispatcher): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'z';
      if (!isUndo || isTextEditing(event.target)) return;
      event.preventDefault();
      void undoWith(dispatcher);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatcher]);
}
