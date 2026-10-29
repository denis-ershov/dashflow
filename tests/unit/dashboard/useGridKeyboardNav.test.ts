import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useGridKeyboardNav,
  applyKeyboardDelta,
} from '@/features/dashboard/hooks/useGridKeyboardNav';

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

  it('не должен двигать виджет стрелками, нажатыми в поле ввода', () => {
    const onMoveWidget = vi.fn();
    renderHook(() =>
      useGridKeyboardNav({ enabled: true, selectedInstanceId: 'widget-1', onMoveWidget }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    input.remove();

    expect(onMoveWidget).not.toHaveBeenCalled();
  });
});

describe('applyKeyboardDelta', () => {
  const item = { i: 'w', x: 0, y: 0, w: 4, h: 2 };

  it('не выводит виджет за левую, правую и верхнюю границы', () => {
    expect(applyKeyboardDelta(item, -1, -1, 'move', 12)).toMatchObject({ x: 0, y: 0 });
    expect(applyKeyboardDelta({ ...item, x: 8 }, 1, 0, 'move', 12)).toMatchObject({ x: 8 });
  });

  it('ограничивает размер минимумом манифеста и шириной сетки', () => {
    expect(applyKeyboardDelta({ ...item, w: 2, h: 2 }, -1, -1, 'resize', 12, 2, 2)).toMatchObject({
      w: 2,
      h: 2,
    });
    expect(applyKeyboardDelta({ ...item, x: 8 }, 1, 0, 'resize', 12)).toMatchObject({ w: 4 });
    expect(applyKeyboardDelta(item, 1, 1, 'resize', 12)).toMatchObject({ w: 5, h: 3 });
  });
});
