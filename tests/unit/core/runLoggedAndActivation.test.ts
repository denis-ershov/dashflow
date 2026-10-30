import { describe, it, expect, vi, afterEach } from 'vitest';
import type React from 'react';
import { crashLogger, runLogged } from '@/core/observability';
import { onActivationKey } from '@/ui/lib/activation';

describe('runLogged', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('пишет отказ промиса в журнал диагностики', async () => {
    const logError = vi.spyOn(crashLogger, 'logError');
    const error = new Error('нет места');

    runLogged(Promise.reject(error), 'storage', { widget: 'todo' });
    await Promise.resolve();
    await Promise.resolve();

    expect(logError).toHaveBeenCalledWith(error, 'storage', { widget: 'todo' });
  });

  it('успешный промис ничего не журналирует', async () => {
    const logError = vi.spyOn(crashLogger, 'logError');
    runLogged(Promise.resolve(1));
    await Promise.resolve();
    expect(logError).not.toHaveBeenCalled();
  });
});

describe('onActivationKey', () => {
  const event = (key: string, sameTarget = true) => {
    const target = {};
    return {
      key,
      target,
      currentTarget: sameTarget ? target : {},
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
  };

  it('Enter и пробел активируют карточку', () => {
    const action = vi.fn();
    const handler = onActivationKey(action);
    handler(event('Enter'));
    handler(event(' '));
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('другие клавиши и нажатия на вложенных кнопках игнорируются', () => {
    const action = vi.fn();
    const handler = onActivationKey(action);
    handler(event('a'));
    handler(event('Enter', false));
    expect(action).not.toHaveBeenCalled();
  });
});
