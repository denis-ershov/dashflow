import { describe, it, expect, beforeEach } from 'vitest';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import {
  UndoConflictError,
  createDispatcher,
  type CommandContext,
  type CommandDefinition,
} from '@/core/commands';
import { dispatchWithUndoToast, undoLast } from '@/features/commands/undo';
import { useUndoHotkey } from '@/features/commands/useUndoHotkey';
import { useToastStore } from '@/ui/primitives/Toast';

function setup(undoBehaviour: 'ok' | 'conflict' | 'fail' = 'ok') {
  let value = 0;
  const set: CommandDefinition<number, number> = {
    type: 'value.set',
    validate: (payload) => Number(payload),
    async execute(next) {
      const before = value;
      value = next;
      return {
        result: value,
        label: { key: 'commands.deleted', params: { title: 'Задача' } },
        undo: async () => {
          if (undoBehaviour === 'conflict') throw new UndoConflictError('x');
          if (undoBehaviour === 'fail') throw new Error('диск');
          value = before;
        },
      };
    },
  };
  const dispatcher = createDispatcher({ context: {} as CommandContext, commands: [set] });
  return { dispatcher, value: () => value };
}

const messages = () => useToastStore.getState().toasts.map((toast) => toast.message);

describe('Отмена в интерфейсе', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('тост с кнопкой «Отменить» откатывает действие', async () => {
    const { dispatcher, value } = setup();
    await dispatchWithUndoToast('value.set', 5, {}, dispatcher);

    const toast = useToastStore.getState().toasts[0];
    expect(toast?.message).toBe('Удалено: «Задача»');
    expect(toast?.action?.label).toBe('Отменить');

    await act(async () => {
      toast?.action?.onClick();
      await Promise.resolve();
    });
    expect(value()).toBe(0);
    expect(messages()).toContain('Действие отменено');
  });

  it('конфликт и сбой отмены показывают понятное сообщение', async () => {
    const conflict = setup('conflict');
    await conflict.dispatcher.dispatch('value.set', 1);
    await undoLast(conflict.dispatcher);
    expect(messages()).toContain('Не удалось отменить: запись уже изменена');

    const failing = setup('fail');
    await failing.dispatcher.dispatch('value.set', 1);
    await undoLast(failing.dispatcher);
    expect(messages()).toContain('Не удалось отменить действие');
  });

  it('Ctrl+Z отменяет действие, но не перехватывается в поле ввода', async () => {
    const { dispatcher, value } = setup();
    renderHook(() => useUndoHotkey(dispatcher));
    const { getByRole } = render(<input type="text" aria-label="поле" />);

    await dispatcher.dispatch('value.set', 3);
    fireEvent.keyDown(getByRole('textbox'), { key: 'z', ctrlKey: true });
    await act(async () => {
      await Promise.resolve();
    });
    expect(value()).toBe(3);

    await act(async () => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(value()).toBe(0);
  });
});
