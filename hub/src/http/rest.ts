import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Actor, HubRepository } from '../db/index.js';
import { denied, missing } from './access.js';
import {
  boardDraft,
  boardPatch,
  changesQuery,
  createDraft,
  idempotencyKey,
  integer,
  invalid,
  itemQuery,
  object,
  parseVersion,
  safeId,
  syncChanges,
  updateDraft,
} from './validation.js';

interface RouteAccess {
  requireScope: (scope: string, write?: boolean) => (request: FastifyRequest) => Promise<void>;
  actor: (request: FastifyRequest) => Actor;
}

export function registerRestRoutes(
  app: FastifyInstance,
  repository: HubRepository,
  { actor, requireScope }: RouteAccess,
  notify: () => void,
) {
  app.get('/v1/items', { onRequest: requireScope('items:read') }, (request) =>
    repository.listItems(itemQuery(request.query, actor(request).id)),
  );
  app.get<{ Params: { id: string } }>(
    '/v1/items/:id',
    { onRequest: requireScope('items:read') },
    (request, reply) => {
      const item = repository.getItem(safeId(request.params.id));
      if (!item) throw missing();
      return reply.header('ETag', `"${item.version}"`).send(item);
    },
  );
  app.get<{ Params: { id: string } }>(
    '/v1/items/:id/history',
    { onRequest: requireScope('sync') },
    (request) => {
      const id = safeId(request.params.id);
      const { limit } = object(request.query, ['limit']);
      const history = repository.listHistory(
        'item',
        id,
        limit === undefined ? undefined : integer(limit, 'limit', 1, 100),
      );
      if (!history.length && !repository.getItem(id, true)) throw missing();
      return { history };
    },
  );
  app.post('/v1/items', { onRequest: requireScope('items:write', true) }, (request, reply) => {
    const key = request.headers['idempotency-key'];
    const principal = actor(request);
    const draft = createDraft(request.body);
    if (draft.kind === 'digest' && !principal.scopes?.includes('digests:write')) throw denied();
    const item = repository.createItem(
      principal,
      draft,
      key === undefined ? undefined : idempotencyKey(key),
    );
    notify();
    return reply.code(201).header('ETag', `"${item.version}"`).send(item);
  });
  app.patch<{ Params: { id: string } }>(
    '/v1/items/:id',
    { onRequest: requireScope('items:write', true) },
    (request, reply) => {
      const item = repository.updateItem(
        actor(request),
        safeId(request.params.id),
        updateDraft(request.body),
        parseVersion(request.headers['if-match']),
      );
      notify();
      return reply.header('ETag', `"${item.version}"`).send(item);
    },
  );
  app.delete<{ Params: { id: string } }>(
    '/v1/items/:id',
    { onRequest: requireScope('items:manage', true) },
    (request, reply) => {
      const supplied = request.headers['if-match'];
      repository.deleteItem(
        actor(request),
        safeId(request.params.id),
        supplied === undefined ? undefined : parseVersion(supplied),
      );
      notify();
      return reply.code(204).send();
    },
  );

  app.get('/v1/boards', { onRequest: requireScope('boards:read') }, () => ({
    boards: repository.listBoards(),
  }));
  app.get<{ Params: { id: string } }>(
    '/v1/boards/:id',
    { onRequest: requireScope('boards:read') },
    (request) => {
      const board = repository.getBoard(safeId(request.params.id));
      if (!board) throw missing();
      return board;
    },
  );
  app.post('/v1/boards', { onRequest: requireScope('boards:write', true) }, (request, reply) => {
    const board = repository.createBoard(actor(request), boardDraft(request.body));
    notify();
    return reply.code(201).send(board);
  });
  app.patch<{ Params: { id: string } }>(
    '/v1/boards/:id',
    { onRequest: requireScope('boards:write', true) },
    (request) => {
      const board = repository.updateBoard(
        actor(request),
        safeId(request.params.id),
        boardPatch(request.body),
      );
      notify();
      return board;
    },
  );
  app.post('/v1/digests', { onRequest: requireScope('digests:write', true) }, (request, reply) => {
    const key = request.headers['idempotency-key'];
    const input = object(request.body, ['title', 'body', 'tags', 'url']);
    const draft = createDraft({ ...input, kind: 'digest', status: 'unread' });
    if (!draft.body?.trim()) return invalid('body');
    const item = repository.createItem(
      actor(request),
      draft,
      key === undefined ? undefined : idempotencyKey(key),
    );
    notify();
    return reply.code(201).send(item);
  });
  app.get('/v1/changes', { onRequest: requireScope('sync') }, (request) => {
    const { since, limit } = changesQuery(request.query);
    return repository.listChanges(since, limit);
  });
  app.post('/v1/sync/push', { onRequest: requireScope('sync', true) }, (request) => {
    const result = repository.pushChanges(actor(request), syncChanges(request.body));
    notify();
    return result;
  });
}
