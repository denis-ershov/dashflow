import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridKeyboardNav } from '@/features/dashboard/hooks/useGridKeyboardNav';

describe('useGridKeyboardNav hook', () => {
  it('при нажатии Escape должен вызывать onExitEditMode', () => {
    const onExitEditMode = vi.fn();
    renderHook(() =>
      useGridKeyboardNav({
        enabled: true,
        selectedInstanceId: 'widget-1',
        onExitEditMode,
        onMoveWidget: vi.fn(),
        onResizeWidget: vi.fn(),
      }),
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onExitEditMode).toHaveBeenCalledTimes(1);
  });

  it('при нажатии стрелок должен перемещать выбранный виджет', () => {
    const onMoveWidget = vi.fn();
    renderHook(() =>
      useGridKeyboardNav({
        enabled: true,
        selectedInstanceId: 'widget-1',
        onExitEditMode: vi.fn(),
        onMoveWidget,
        onResizeWidget: vi.fn(),
      }),
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(onMoveWidget).toHaveBeenCalledWith('widget-1', 1, 0);
    expect(onMoveWidget).toHaveBeenCalledWith('widget-1', 0, 1);
  });

  it('при нажатии Shift + стрелки должен изменять размер виджета', () => {
    const onResizeWidget = vi.fn();
    renderHook(() =>
      useGridKeyboardNav({
        enabled: true,
        selectedInstanceId: 'widget-1',
        onExitEditMode: vi.fn(),
        onMoveWidget: vi.fn(),
        onResizeWidget,
      }),
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }));
    });

    expect(onResizeWidget).toHaveBeenCalledWith('widget-1', 1, 0);
    expect(onResizeWidget).toHaveBeenCalledWith('widget-1', 0, -1);
  });

  it('не должен обрабатывать клавиши, когда enabled=false', () => {
    const onMoveWidget = vi.fn();
    const onExitEditMode = vi.fn();
    renderHook(() =>
      useGridKeyboardNav({
        enabled: false,
        selectedInstanceId: 'widget-1',
        onExitEditMode,
        onMoveWidget,
        onResizeWidget: vi.fn(),
      }),
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onMoveWidget).not.toHaveBeenCalled();
    expect(onExitEditMode).not.toHaveBeenCalled();
  });
});
