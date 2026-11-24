/**
 * Единая модель содержимого рабочего пространства (ITEMS_ARCHITECTURE.md, ADR-017).
 * Задачи, заметки, ссылки, напоминания, дайджесты и карточки — один тип Item с разным kind,
 * а виджеты — представления над ним. Так данные одинаково создают пользователь, агенты и
 * коннекторы, а синхронизация (этап 3) работает с одной таблицей.
 */

export const ITEM_KINDS = [
  'task',
  'note',
  'link',
  'reminder',
  'digest',
  'article',
  'card',
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** Стандартные статусы; колонки досок могут задавать свои id */
export const BASE_STATUSES = ['inbox', 'todo', 'doing', 'done'] as const;

/** Статус заметок из виджета «Заметки»: не задача и не входящее */
export const NOTE_STATUS = 'active';
/** Статус сохранённых ссылок (быстрые ссылки) */
export const LINK_STATUS = 'saved';

export const ITEM_PRIORITIES = ['low', 'medium', 'high'] as const;
export type ItemPriority = (typeof ITEM_PRIORITIES)[number];

export const SOURCE_TYPES = ['user', 'agent', 'connector', 'import'] as const;
export type ItemSourceType = (typeof SOURCE_TYPES)[number];
export type ItemAssignee = `agent:${string}`;

/** Кто создал или изменил запись — для значка источника, фильтров, аудита и отката */
export interface ItemSource {
  type: ItemSourceType;
  id: string;
  name: string;
}

export interface Item {
  /** ULID: уникален и сортируется по времени создания */
  id: string;
  kind: ItemKind;
  title: string;
  /** Markdown; на экран — только через санитайзер */
  body?: string;
  /** Только http(s) */
  url?: string;
  status: string;
  boardId?: string;
  /** Дробный ключ порядка внутри колонки/списка (orderBetween) */
  order: string;
  priority?: ItemPriority;
  /** ISO 8601 */
  dueAt?: string;
  /** ISO 8601 */
  remindAt?: string;
  tags: string[];
  source: ItemSource;
  pinned?: boolean;
  assignee?: ItemAssignee;
  /** Ответ назначенного агента хранится отдельно от исходного описания. */
  agentComment?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  /** Мягкое удаление: запись в корзине, окончательно удаляется очисткой */
  deletedAt?: string;
  /** +1 на каждое изменение; основа разрешения конфликтов синхронизации */
  version: number;
}

/** Поля, которые задаёт создающий; служебные (id, даты, версия) проставляет хранилище */
export type ItemDraft = Pick<Item, 'kind' | 'title'> &
  Partial<
    Pick<
      Item,
      | 'body'
      | 'url'
      | 'status'
      | 'boardId'
      | 'order'
      | 'priority'
      | 'dueAt'
      | 'remindAt'
      | 'tags'
      | 'pinned'
      | 'assignee'
      | 'agentComment'
    >
  >;

/** Поля, которые можно очистить в изменении, передав null */
export const CLEARABLE_FIELDS = [
  'body',
  'url',
  'boardId',
  'priority',
  'dueAt',
  'remindAt',
  'assignee',
  'agentComment',
] as const;
type ClearableField = (typeof CLEARABLE_FIELDS)[number];

/** Изменение записи: отсутствующий ключ — не трогать, null — очистить (для CLEARABLE_FIELDS) */
export type ItemPatch = Partial<Omit<ItemDraft, 'kind' | ClearableField>> & {
  [K in ClearableField]?: ItemDraft[K] | null;
} & { archivedAt?: string | null };

export interface BoardColumn {
  id: string;
  title: string;
  wipLimit?: number;
}

export interface Board {
  id: string;
  title: string;
  columns: BoardColumn[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export type BoardDraft = Pick<Board, 'title'> & Partial<Pick<Board, 'columns'>>;

export type ItemChangeOp = 'create' | 'update' | 'delete' | 'restore' | 'purge';

/** Запись журнала изменений: отмена, аудит, синхронизация */
export interface ItemChange {
  seq: number;
  itemId: string;
  op: ItemChangeOp;
  version: number;
  at: string;
  source: ItemSource;
}

export interface ItemQuery {
  kind?: ItemKind | readonly ItemKind[];
  status?: string | readonly string[];
  boardId?: string;
  tag?: string;
  /** По умолчанию удалённые и архивные не возвращаются */
  includeArchived?: boolean;
  includeDeleted?: boolean;
  /** Только удалённые (корзина) */
  onlyDeleted?: boolean;
  /** Сортировка: по порядку (по умолчанию), по дате изменения или создания (новые сверху) */
  sort?: 'order' | 'updatedAt' | 'createdAt';
  limit?: number;
}
