import { useState, useEffect, useCallback } from 'react';

export interface UseGridKeyboardNavOptions {
  enabled: boolean;
  selectedInstanceId?: string | null;
  onExitEditMode?: () => void;
  onMoveWidget?: (instanceId: string, deltaX: number, deltaY: number) => void;
  onResizeWidget?: (instanceId: string, deltaW: number, deltaH: number) => void;
}

/**
 * Хук клавиатурной навигации и управления раскладкой сетки в режиме правки (Спецификация Секция 3)
 * Поддерживает:
 * - Стрелки: перемещение виджета по сетке
 * - Shift + стрелки: изменение размера виджета
 * - Escape: выход из режима редактирования
 * - aria-live объявление статуса для скринридеров
 */
export function useGridKeyboardNav({
  enabled,
  selectedInstanceId,
  onExitEditMode,
  onMoveWidget,
  onResizeWidget,
}: UseGridKeyboardNavOptions) {
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Escape: выход из режима редактирования
      if (event.key === 'Escape') {
        event.preventDefault();
        onExitEditMode?.();
        setLiveAnnouncement('Режим редактирования завершен');
        return;
      }

      if (!selectedInstanceId) return;

      let deltaX = 0;
      let deltaY = 0;

      switch (event.key) {
        case 'ArrowLeft':
          deltaX = -1;
          break;
        case 'ArrowRight':
          deltaX = 1;
          break;
        case 'ArrowUp':
          deltaY = -1;
          break;
        case 'ArrowDown':
          deltaY = 1;
          break;
        default:
          return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        // Изменение размера
        onResizeWidget?.(selectedInstanceId, deltaX, deltaY);
        setLiveAnnouncement(`Размер виджета изменен: ${deltaX ? `по ширине (${deltaX > 0 ? '+1' : '-1'})` : ''} ${deltaY ? `по высоте (${deltaY > 0 ? '+1' : '-1'})` : ''}`);
      } else {
        // Перемещение
        onMoveWidget?.(selectedInstanceId, deltaX, deltaY);
        setLiveAnnouncement(`Виджет перемещен: ${deltaX ? `по горизонтали (${deltaX > 0 ? '+1' : '-1'})` : ''} ${deltaY ? `по вертикали (${deltaY > 0 ? '+1' : '-1'})` : ''}`);
      }
    },
    [enabled, selectedInstanceId, onExitEditMode, onMoveWidget, onResizeWidget],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    liveAnnouncement,
  };
}
