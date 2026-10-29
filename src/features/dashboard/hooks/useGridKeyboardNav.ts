import { useState, useEffect, useCallback } from 'react';
import type { LayoutItem } from '@/core/storage';
import { useTranslation } from '@/core/i18n';

export interface UseGridKeyboardNavOptions {
  enabled: boolean;
  selectedInstanceId?: string | null;
  onExitEditMode?: () => void;
  onMoveWidget?: (instanceId: string, deltaX: number, deltaY: number) => void;
  onResizeWidget?: (instanceId: string, deltaW: number, deltaH: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Сдвиг или изменение размера одного элемента раскладки с удержанием в границах сетки */
export function applyKeyboardDelta(
  item: LayoutItem,
  dx: number,
  dy: number,
  mode: 'move' | 'resize',
  cols: number,
  minW = 1,
  minH = 1,
): LayoutItem {
  if (mode === 'move') {
    return { ...item, x: clamp(item.x + dx, 0, cols - item.w), y: Math.max(item.y + dy, 0) };
  }
  const w = clamp(item.w + dx, Math.min(minW, cols), cols - item.x);
  return { ...item, w, h: Math.max(item.h + dy, minH) };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
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
  const { t } = useTranslation();
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Escape: выход из режима редактирования
      if (event.key === 'Escape') {
        event.preventDefault();
        onExitEditMode?.();
        setLiveAnnouncement(t('grid.keyboard.editingFinished'));
        return;
      }

      // Стрелки в полях ввода внутри виджета принадлежат полю, а не сетке
      if (!selectedInstanceId || isEditableTarget(event.target)) return;

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
        setLiveAnnouncement(t('grid.keyboard.resized'));
      } else {
        // Перемещение
        onMoveWidget?.(selectedInstanceId, deltaX, deltaY);
        setLiveAnnouncement(t('grid.keyboard.moved'));
      }
    },
    [enabled, selectedInstanceId, onExitEditMode, onMoveWidget, onResizeWidget, t],
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
