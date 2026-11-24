import { describe, it, expect, vi } from 'vitest';
import {
  COALESCE_WINDOW_MS,
  HISTORY_LIMIT,
  UnknownCommandError,
  createDispatcher,
  type CommandContext,
  type CommandDefinition,
} from '@/core/commands';

/** Простая команда «счётчик» для проверки диспетчера без хранилища */
function counterSetup() {
  let value = 0;
  const log: string[] = [];
  const add: CommandDefinition<number, number> = {
    type: 'counter.add',
    validate: (payload) => {
      if (typeof payload !== 'number') throw new TypeError('number expected');
      return payload;
    },
    async execute(amount) {
      const before = value;
      value += amount;
      log.push(`add ${amount}`);
      return {
        result: value,
        undo: async () => {
          value = before;
          log.push(`undo ${amount}`);
        },
      };
    },
  };
  const noop: CommandDefinition<null, null> = {
    type: 'counter.noop',
    validate: () => null,
    execute: async () => ({ result: null }),
  };
  let clock = 0;
  const dispatcher = createDispatcher({
    context: {} as CommandContext,
    commands: [add, noop],
    now: () => clock,
  });
  return {
    dispatcher,
    value: () => value,
    log,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe('Диспетчер команд', () => {
  it('выполняет команду и отменяет её', async () => {
    const { dispatcher, value } = counterSetup();
    const outcome = await dispatcher.dispatch('counter.add', 5);
    expect(outcome.result).toBe(5);
    expect(dispatcher.canUndo()).toBe(true);

    expect(await dispatcher.undo()).toBe(true);
    expect(value()).toBe(0);
    expect(await dispatcher.undo()).toBe(false);
  });

  it('отклоняет неизвестную команду и невалидный вход без побочных эффектов', async () => {
    const { dispatcher, value } = counterSetup();
    await expect(dispatcher.dispatch('nope', 1)).rejects.toBeInstanceOf(UnknownCommandError);
    await expect(dispatcher.dispatch('counter.add', 'пять')).rejects.toBeInstanceOf(TypeError);
    expect(value()).toBe(0);
    expect(dispatcher.canUndo()).toBe(false);
  });

  it('команды без undo и skipHistory не попадают в историю', async () => {
    const { dispatcher } = counterSetup();
    await dispatcher.dispatch('counter.noop', null);
    await dispatcher.dispatch('counter.add', 1, { skipHistory: true });
    expect(dispatcher.canUndo()).toBe(false);
  });

  it('склеивает правки с одним ключом в окне и отменяет серию целиком', async () => {
    const { dispatcher, value, advance, log } = counterSetup();
    await dispatcher.dispatch('counter.add', 1, { coalesceKey: 'note' });
    advance(1000);
    await dispatcher.dispatch('counter.add', 2, { coalesceKey: 'note' });
    advance(COALESCE_WINDOW_MS + 1);
    await dispatcher.dispatch('counter.add', 4, { coalesceKey: 'note' });

    expect(value()).toBe(7);
    await dispatcher.undo(); // отдельная правка вне окна
    expect(value()).toBe(3);
    await dispatcher.undo(); // серия 1 + 2 — одним шагом, от последней к первой
    expect(value()).toBe(0);
    expect(log.slice(-2)).toEqual(['undo 2', 'undo 1']);
    expect(dispatcher.canUndo()).toBe(false);
  });

  it('хранит не больше HISTORY_LIMIT действий', async () => {
    const { dispatcher, value } = counterSetup();
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) await dispatcher.dispatch('counter.add', 1);
    let undone = 0;
    while (await dispatcher.undo()) undone++;
    expect(undone).toBe(HISTORY_LIMIT);
    expect(value()).toBe(5);
  });

  it('выполняет отмены по очереди и уведомляет подписчиков', async () => {
    const { dispatcher, value } = counterSetup();
    const listener = vi.fn();
    const unsubscribe = dispatcher.subscribe(listener);
    await dispatcher.dispatch('counter.add', 1);
    await dispatcher.dispatch('counter.add', 1);

    await Promise.all([dispatcher.undo(), dispatcher.undo()]);
    expect(value()).toBe(0);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it('отменяет указанную запись один раз и оставляет более новое действие в истории', async () => {
    const { dispatcher, log } = counterSetup();
    const first = await dispatcher.dispatch('counter.add', 1);
    const second = await dispatcher.dispatch('counter.add', 2);

    expect(first.historyId).toBeDefined();
    expect(await dispatcher.undo(first.historyId)).toBe(true);
    expect(await dispatcher.undo(first.historyId)).toBe(false);
    expect(dispatcher.peek()?.id).toBe(second.historyId);
    expect(await dispatcher.undo()).toBe(true);
    expect(log).toEqual(['add 1', 'add 2', 'undo 1', 'undo 2']);
  });

  it('ставит группу в очередь целиком и включает в её отмену успешные команды', async () => {
    const { dispatcher, log, value } = counterSetup();
    const group = dispatcher.dispatchGroup([
      { type: 'counter.add', payload: 1 },
      { type: 'counter.add', payload: 'invalid' },
      { type: 'counter.add', payload: 2 },
    ]);
    const later = dispatcher.dispatch('counter.add', 3);
    const result = await group;
    await later;
    expect(result.applied).toEqual([0, 2]);
    expect(log).toEqual(['add 1', 'add 2', 'add 3']);
    await dispatcher.undo();
    expect(await dispatcher.undo(result.historyId)).toBe(true);
    expect(value()).toBe(0);
    expect(log.slice(-3)).toEqual(['undo 3', 'undo 2', 'undo 1']);
  });
});
