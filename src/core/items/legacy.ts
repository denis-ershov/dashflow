import { STORAGE_KEYS } from '@/core/storage/keys';
import { isValidContent } from '@/core/storage/userContent';
import { ordersBetween, ulid } from './ids';
import { ITEM_LIMITS } from './validation';
import {
  LINK_STATUS,
  NOTE_STATUS,
  type Board,
  type Item,
  type ItemPriority,
  type ItemSource,
} from './types';

/**
 * Перенос содержимого виджетов 3.8 (отдельные ключи хранилища) в Item. Чистая функция:
 * на входе — снимок ключей и список экземпляров виджетов, на выходе — готовые записи и доски.
 * Используется и миграцией при запуске, и импортом файлов экспорта 2.x.
 *
 * Данные экземпляра выбираются так же, как их показывал виджет: своя копия
 * `<ключ>_<instanceId>`, если она не пуста, иначе общий ключ. Привычки остаются в прежнем
 * формате (своя модель «история по дням»).
 */

export interface LegacyInstance {
  instanceId: string;
  widgetId: string;
}

/** Названия создаваемых досок и запасной заголовок заметки — на языке интерфейса */
export interface LegacyLabels {
  tasks: string;
  todoColumn: string;
  doneColumn: string;
  links: string;
  note: string;
}

/** Что получил экземпляр виджета: доску (задачи, ссылки) или запись (заметка) */
export interface LegacyMappingEntry {
  boardId?: string;
  itemId?: string;
}

export interface LegacyConversion {
  items: Item[];
  boards: Board[];
  mapping: Record<string, LegacyMappingEntry>;
  /** Значения, не прошедшие проверку формы: остаются в старых ключах, в Item не попадают */
  skipped: number;
}

export interface ConvertLegacyOptions {
  snapshot: Readonly<Record<string, unknown>>;
  instances: readonly LegacyInstance[];
  labels: LegacyLabels;
  source: ItemSource;
  now: Date;
}

type LegacyKind = 'todos' | 'notes' | 'links';

const WIDGETS: Record<string, { kind: LegacyKind; base: string }> = {
  todo: { kind: 'todos', base: STORAGE_KEYS.TODO_ITEMS },
  notes: { kind: 'notes', base: STORAGE_KEYS.NOTES_CONTENT },
  quickLinks: { kind: 'links', base: STORAGE_KEYS.QUICK_LINKS },
};

interface LegacyTodo {
  text: string;
  completed: boolean;
  priority: ItemPriority;
  createdAt?: number;
}

interface LegacyLink {
  title: string;
  url: string;
}

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'string' && value.trim() === '');

const clip = (text: string, max: number) => text.trim().slice(0, max);

/** Заголовок заметки — первая содержательная строка без разметки Markdown */
export function noteTitleFrom(body: string, fallback: string): string {
  const line = body
    .split('\n')
    .map((raw) => raw.replace(/^\s*(#{1,6}|[-*+]|\d+\.)\s*(\[[ xX]\]\s*)?/, '').trim())
    .find((text) => text.length > 0);
  return clip(line ?? fallback, 120) || fallback;
}

export function convertLegacyContent(options: ConvertLegacyOptions): LegacyConversion {
  const { snapshot, labels, source } = options;
  const timestamp = options.now.toISOString();
  const result: LegacyConversion = { items: [], boards: [], mapping: {}, skipped: 0 };
  const consumedBases = new Set<string>();

  const baseItem = (fields: Pick<Item, 'kind' | 'title' | 'status' | 'order'>) => ({
    ...fields,
    id: ulid(options.now.getTime()),
    tags: [],
    source,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  });

  const newBoard = (title: string, columns: Board['columns'], archived: boolean): Board => {
    const board: Board = {
      id: ulid(options.now.getTime()),
      title,
      columns,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (archived) board.archivedAt = timestamp;
    result.boards.push(board);
    return board;
  };

  function convert(kind: LegacyKind, value: unknown, archived: boolean): LegacyMappingEntry {
    if (!isValidContent(kind, value)) {
      result.skipped++;
      return {};
    }
    const archivedAt = archived ? { archivedAt: timestamp } : {};

    if (kind === 'notes') {
      const body = (value as string).slice(0, ITEM_LIMITS.bodyLength);
      const note: Item = {
        ...baseItem({
          kind: 'note',
          title: noteTitleFrom(body, labels.note),
          status: NOTE_STATUS,
          order: ordersBetween(undefined, undefined, 1)[0] ?? 'a0',
        }),
        body,
        ...archivedAt,
      };
      result.items.push(note);
      return { itemId: note.id };
    }

    if (kind === 'todos') {
      const todos = value as LegacyTodo[];
      const board = newBoard(
        labels.tasks,
        [
          { id: 'todo', title: labels.todoColumn },
          { id: 'done', title: labels.doneColumn },
        ],
        archived,
      );
      const orders = ordersBetween(undefined, undefined, todos.length);
      todos.forEach((todo, index) => {
        const title = clip(todo.text, ITEM_LIMITS.titleLength);
        if (!title) {
          result.skipped++;
          return;
        }
        const created =
          typeof todo.createdAt === 'number' && Number.isFinite(todo.createdAt)
            ? new Date(todo.createdAt).toISOString()
            : timestamp;
        result.items.push({
          ...baseItem({
            kind: 'task',
            title,
            status: todo.completed ? 'done' : 'todo',
            order: orders[index] ?? 'a0',
          }),
          boardId: board.id,
          priority: todo.priority,
          createdAt: created,
          ...archivedAt,
        });
      });
      return { boardId: board.id };
    }

    const links = value as LegacyLink[];
    const board = newBoard(labels.links, [{ id: LINK_STATUS, title: labels.links }], archived);
    const orders = ordersBetween(undefined, undefined, links.length);
    links.forEach((link, index) => {
      result.items.push({
        ...baseItem({
          kind: 'link',
          title: clip(link.title, ITEM_LIMITS.titleLength) || link.url,
          status: LINK_STATUS,
          order: orders[index] ?? 'a0',
        }),
        url: link.url,
        boardId: board.id,
        ...archivedAt,
      });
    });
    return { boardId: board.id };
  }

  for (const instance of options.instances) {
    const widget = WIDGETS[instance.widgetId];
    if (!widget) continue;
    const scoped = snapshot[`${widget.base}_${instance.instanceId}`];
    const value = isEmpty(scoped) ? snapshot[widget.base] : scoped;
    if (isEmpty(scoped)) consumedBases.add(widget.base);
    if (isEmpty(value)) continue;
    result.mapping[instance.instanceId] = convert(widget.kind, value, false);
  }

  // Общий ключ виджета, которого больше нет на дашборде, — в архив, а не в никуда
  const hasInstance = (widgetId: string) => options.instances.some((i) => i.widgetId === widgetId);
  for (const [widgetId, widget] of Object.entries(WIDGETS)) {
    const orphan = snapshot[widget.base];
    if (!hasInstance(widgetId) && !consumedBases.has(widget.base) && !isEmpty(orphan)) {
      convert(widget.kind, orphan, true);
    }
  }

  return result;
}
