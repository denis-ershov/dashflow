import { ItemValidationError, parseItemPatch, type Board, type Item } from '@dashflow/shared';
import { HubDbError, type HubRepository, type ListItemsQuery } from '../db/index.js';
import { actorFor, windowLimiter } from '../http/access.js';

export type Scope = 'items:read' | 'items:write' | 'boards:read' | 'digests:write';
type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export class WorkspaceError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

export function errorCode(error: unknown): ErrorCode {
  if (error instanceof WorkspaceError || error instanceof HubDbError) return error.code;
  if (error instanceof ItemValidationError) return 'VALIDATION_FAILED';
  return 'INTERNAL_ERROR';
}

export interface McpWorkspaceOptions {
  repository: HubRepository;
  token: string;
  allowWrite?: (tokenId: string) => boolean;
  now?: () => Date;
}

function compactItem(item: Item) {
  return {
    id: item.id,
    version: item.version,
    kind: item.kind,
    title: item.title,
    status: item.status,
    boardId: item.boardId,
    dueAt: item.dueAt,
    remindAt: item.remindAt,
    priority: item.priority,
    assignee: item.assignee,
  };
}

function compactBoard({ id, title, columns }: Board) {
  return { id, title, columns };
}

function agendaRange(from: string | undefined, to: string | undefined, now: Date) {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  const start = from ? Date.parse(from) : day.getTime();
  const end = to ? Date.parse(to) : start + 86_400_000;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 31 * 86_400_000
  ) {
    throw new WorkspaceError('VALIDATION_FAILED');
  }
  return { start, end };
}

export function workspace({
  repository,
  token,
  allowWrite,
  now = () => new Date(),
}: McpWorkspaceOptions) {
  const credential = repository.authenticateToken(token);
  if (!credential) throw new WorkspaceError('UNAUTHORIZED');
  const actor = actorFor(credential);
  const limited = windowLimiter();
  const permitWrite = allowWrite ?? ((tokenId: string) => limited(tokenId, 60));

  function authorize(scope: Scope) {
    if (!repository.isTokenActive(actor.id)) throw new WorkspaceError('UNAUTHORIZED');
    if (!actor.scopes?.includes(scope)) throw new WorkspaceError('FORBIDDEN');
  }

  function write<T>(scope: Scope, action: string, run: () => T) {
    try {
      authorize(scope);
      if (!permitWrite(actor.id)) throw new WorkspaceError('RATE_LIMITED');
      return run();
    } catch (error) {
      try {
        repository.recordAudit({ actorId: actor.id, action: `mcp:${action}`, outcome: 'denied' });
      } catch {
        // Возвращаем первоначальную ошибку, детали хранилища агенту не нужны.
      }
      throw error;
    }
  }

  const activeItem = (id: string) => {
    const item = repository.getItem(id);
    if (!item) throw new WorkspaceError('NOT_FOUND');
    return item;
  };
  const activeBoard = (id: string) => {
    const board = repository.getBoard(id);
    if (!board || board.archivedAt) throw new WorkspaceError('NOT_FOUND');
    return board;
  };
  const list = (query: ListItemsQuery) => {
    const assignee = query.assignee === 'me' ? `agent:${actor.id}` : query.assignee;
    const { items, nextCursor } = repository.listItems({
      ...query,
      assignee,
      limit: query.limit ?? 15,
    });
    return { items: items.map(compactItem), nextCursor };
  };
  const create = (draft: unknown, key?: string) =>
    compactItem(repository.createItem(actor, draft, key));
  const update = (id: string, patch: unknown, version: number) => {
    const parsed = parseItemPatch(patch);
    if (!Object.keys(parsed).length) throw new WorkspaceError('VALIDATION_FAILED');
    return compactItem(repository.updateItem(actor, id, parsed, version));
  };

  function agenda({ from, to, limit = 15 }: { from?: string; to?: string; limit?: number }) {
    const { start, end } = agendaRange(from, to, now());
    const matching: { item: Item; time: number }[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page++) {
      const { items, nextCursor } = repository.listItems({ limit: 100, cursor });
      for (const item of items) {
        const times = [item.dueAt, item.remindAt].flatMap((entry) =>
          entry ? [Date.parse(entry)] : [],
        );
        const time = Math.min(...times.filter((at) => at >= start && at < end));
        if (Number.isFinite(time)) matching.push({ item, time });
      }
      cursor = nextCursor ?? undefined;
      if (!cursor) break;
    }
    return {
      from: new Date(start).toISOString(),
      to: new Date(end).toISOString(),
      items: matching
        .sort((a, b) => a.time - b.time || a.item.id.localeCompare(b.item.id))
        .slice(0, limit)
        .map(({ item }) => compactItem(item)),
      truncated: Boolean(cursor) || matching.length > limit,
    };
  }

  return {
    authorize,
    write,
    list,
    create,
    update,
    agenda,
    get(id: string) {
      const item = activeItem(id);
      return {
        ...compactItem(item),
        url: item.url,
        tags: item.tags,
        body: item.body?.slice(0, 4_000),
        bodyTruncated: (item.body?.length ?? 0) > 4_000,
      };
    },
    completeTask(id: string, version: number) {
      if (activeItem(id).kind !== 'task') throw new WorkspaceError('VALIDATION_FAILED');
      return update(id, { status: 'done' }, version);
    },
    moveCard(id: string, boardId: string, columnId: string, version: number) {
      const item = activeItem(id);
      const board = activeBoard(boardId);
      if (
        !['task', 'card'].includes(item.kind) ||
        !board.columns.some((column) => column.id === columnId)
      ) {
        throw new WorkspaceError('VALIDATION_FAILED');
      }
      return update(id, { boardId, status: columnId }, version);
    },
    boards(limit = 15) {
      const boards = repository.listBoards();
      return { boards: boards.slice(0, limit).map(compactBoard), truncated: boards.length > limit };
    },
    board(id: string) {
      return { board: compactBoard(activeBoard(id)), ...list({ boardId: id, limit: 15 }) };
    },
  };
}
