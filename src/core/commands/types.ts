import type { ItemRepository, ItemSource } from '@/core/items';

/**
 * Командная шина (ADR-018): всё, что меняет данные рабочего пространства, выполняется как
 * команда. Так у каждого изменения есть источник (пользователь, агент, коннектор), проверка
 * входа в одном месте и обратное действие для отмены.
 */

export interface CommandContext {
  repository: ItemRepository;
  source: ItemSource;
}

export interface CommandOutcome<R> {
  result: R;
  /**
   * Обратное действие. Отсутствует у команд, которые нечего отменять
   * (например, изменение без фактических правок).
   */
  undo?: () => Promise<void>;
  /** Короткое описание для тоста «Отменить» (ключ перевода и параметры) */
  label?: CommandLabel;
}

export interface CommandLabel {
  key: string;
  params?: Record<string, string | number>;
}

export interface CommandDefinition<P, R> {
  type: string;
  /** Проверка недоверенного входа; бросает ошибку валидации */
  validate: (payload: unknown) => P;
  execute: (payload: P, ctx: CommandContext) => Promise<CommandOutcome<R>>;
}

/**
 * Команда со стёртыми типами — для списков разнородных команд. validate возвращает P
 * (ковариантно), execute принимает P (контравариантно), поэтому общий вид — unknown и never.
 */
export interface AnyCommandDefinition {
  type: string;
  validate: (payload: unknown) => unknown;
  execute: (payload: never, ctx: CommandContext) => Promise<CommandOutcome<unknown>>;
}

export interface DispatchOptions {
  /**
   * Склейка в истории: подряд идущие команды с одинаковым ключом в пределах окна
   * становятся одной записью отмены (правка текста заметки — один шаг, а не сто).
   */
  coalesceKey?: string;
  /** Не записывать в историю отмены (служебные изменения, миграции) */
  skipHistory?: boolean;
}

export interface HistoryEntry {
  type: string;
  label?: CommandLabel;
  undo: () => Promise<void>;
  coalesceKey?: string;
  at: number;
}
