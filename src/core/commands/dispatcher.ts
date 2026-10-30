import type {
  AnyCommandDefinition,
  CommandContext,
  CommandDefinition,
  CommandOutcome,
  DispatchOptions,
  HistoryEntry,
} from './types';

export const HISTORY_LIMIT = 50;
/** Окно склейки однотипных правок (coalesceKey) */
export const COALESCE_WINDOW_MS = 5_000;

export class UnknownCommandError extends Error {
  constructor(public readonly type: string) {
    super(`Неизвестная команда ${type}`);
    this.name = 'UnknownCommandError';
  }
}

type AnyCommand = CommandDefinition<unknown, unknown>;
type Listener = () => void;

export interface DispatcherOptions {
  context: CommandContext;
  commands: readonly AnyCommandDefinition[];
  now?: () => number;
}

/**
 * Выполняет команды и ведёт историю отмены вкладки (последние HISTORY_LIMIT действий).
 * История живёт в памяти страницы: после перезагрузки отменять нечего, а журнал изменений
 * в хранилище остаётся для аудита и синхронизации.
 */
export function createDispatcher(options: DispatcherOptions) {
  const now = options.now ?? Date.now;
  const registry = new Map<string, AnyCommand>(
    options.commands.map((command) => [command.type, command as unknown as AnyCommand]),
  );
  const history: HistoryEntry[] = [];
  const listeners = new Set<Listener>();
  // Отмены выполняются строго по одной: двойное Ctrl+Z не должно отменять параллельно
  let queue: Promise<unknown> = Promise.resolve();

  const emit = () => listeners.forEach((listener) => listener());

  function remember(type: string, outcome: CommandOutcome<unknown>, dispatch: DispatchOptions) {
    if (!outcome.undo || dispatch.skipHistory) return;
    const last = history.at(-1);
    const coalesce =
      dispatch.coalesceKey !== undefined &&
      last?.coalesceKey === dispatch.coalesceKey &&
      now() - last.at < COALESCE_WINDOW_MS;
    if (coalesce) {
      // Серия отменяется целиком: от последней правки к первой, каждая — со своей проверкой
      const later = outcome.undo;
      const earlier = last.undo;
      last.undo = async () => {
        await later();
        await earlier();
      };
      last.at = now();
      return;
    }
    history.push({
      type,
      label: outcome.label,
      undo: outcome.undo,
      coalesceKey: dispatch.coalesceKey,
      at: now(),
    });
    if (history.length > HISTORY_LIMIT) history.shift();
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    /** Выполняет команду: проверка входа → действие → запись в историю */
    dispatch<R = unknown>(
      type: string,
      payload: unknown,
      dispatchOptions: DispatchOptions = {},
    ): Promise<CommandOutcome<R>> {
      const command = registry.get(type);
      if (!command) return Promise.reject(new UnknownCommandError(type));
      let validated: unknown;
      try {
        validated = command.validate(payload);
      } catch (error) {
        // Ошибка валидации — отклонённый промис, как и любая другая ошибка команды
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      return enqueue(async () => {
        const outcome = await command.execute(validated, options.context);
        remember(type, outcome, dispatchOptions);
        emit();
        return outcome as CommandOutcome<R>;
      });
    },

    /** Отменяет последнее действие; false — отменять нечего */
    undo(): Promise<boolean> {
      return enqueue(async () => {
        const entry = history.pop();
        if (!entry) return false;
        try {
          await entry.undo();
        } finally {
          emit();
        }
        return true;
      });
    },

    canUndo: () => history.length > 0,
    /** Описание последнего отменяемого действия (для подсказки «Отменить: …») */
    peek: () => history.at(-1),

    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type Dispatcher = ReturnType<typeof createDispatcher>;
