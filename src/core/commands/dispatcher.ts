import type {
  AnyCommandDefinition,
  CommandContext,
  CommandDefinition,
  CommandOutcome,
  DispatchOptions,
  DispatchOutcome,
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
interface CommandRequest {
  type: string;
  payload: unknown;
}

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
  let nextHistoryId = 0;
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
      return last.id;
    }
    const id = ++nextHistoryId;
    history.push({
      id,
      type,
      label: outcome.label,
      undo: outcome.undo,
      coalesceKey: dispatch.coalesceKey,
      at: now(),
    });
    if (history.length > HISTORY_LIMIT) history.shift();
    return id;
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  function prepare({ type, payload }: CommandRequest) {
    const command = registry.get(type);
    if (!command) throw new UnknownCommandError(type);
    const validated = command.validate(payload);
    return () => command.execute(validated, options.context);
  }

  /**
   * В группе могут успешно выполниться только некоторые команды.
   * Группу нельзя прервать другой командой или отменой из этой вкладки.
   */
  async function executeGroup(requests: readonly CommandRequest[]) {
    const applied: number[] = [];
    const undos: (() => Promise<void>)[] = [];
    for (const [index, request] of requests.entries()) {
      try {
        const outcome = await prepare(request)();
        applied.push(index);
        if (outcome.undo) undos.push(outcome.undo);
      } catch {
        // Вызывающий получает индексы выполненных команд и может повторить остальные.
      }
    }
    const first = requests[0];
    const historyId =
      first && undos.length
        ? remember(first.type, { result: undefined, undo: () => undoGroup(undos) }, {})
        : undefined;
    if (applied.length) emit();
    return { applied, historyId };
  }

  async function undoGroup(undos: (() => Promise<void>)[]) {
    const errors: unknown[] = [];
    for (const undo of [...undos].reverse()) {
      try {
        await undo();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw errors[0];
  }

  return {
    /** Выполняет команду: проверка входа → действие → запись в историю */
    dispatch<R = unknown>(
      type: string,
      payload: unknown,
      dispatchOptions: DispatchOptions = {},
    ): Promise<DispatchOutcome<R>> {
      let run: () => Promise<CommandOutcome<unknown>>;
      try {
        run = prepare({ type, payload });
      } catch (error) {
        // Ошибка валидации — отклонённый промис, как и любая другая ошибка команды
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
      return enqueue(async () => {
        const outcome = await run();
        const historyId = remember(type, outcome, dispatchOptions);
        emit();
        return { ...outcome, historyId } as DispatchOutcome<R>;
      });
    },

    dispatchGroup(requests: readonly CommandRequest[]) {
      return enqueue(() => executeGroup(requests));
    },

    /** Отменяет выбранное или последнее действие; false — такой записи уже нет. */
    undo(historyId?: number): Promise<boolean> {
      return enqueue(async () => {
        const index =
          historyId === undefined
            ? history.length - 1
            : history.findIndex((entry) => entry.id === historyId);
        if (index < 0) return false;
        const [entry] = history.splice(index, 1);
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
