import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Actor, HubRepository } from '../db/index.js';
import { object, safeId, text } from './validation.js';

interface DeviceAccess {
  requireScope: (scope: string, write?: boolean) => (request: FastifyRequest) => Promise<void>;
  actor: (request: FastifyRequest) => Actor;
}

export function registerAgentRoutes(
  app: FastifyInstance,
  repository: HubRepository,
  { actor, requireScope }: DeviceAccess,
  notify: () => void,
) {
  app.get('/v1/agents', { onRequest: requireScope('sync') }, (request) => ({
    agents: repository.listAgents(actor(request)),
  }));

  app.post<{ Params: { id: string } }>(
    '/v1/agents/:id/revoke',
    { onRequest: requireScope('sync', true) },
    (request) => {
      object(request.body, []);
      return { agent: repository.revokeAgent(actor(request), safeId(request.params.id)) };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/v1/agents/:id/rollback/preview',
    { onRequest: requireScope('sync', true) },
    (request) => {
      const { since, until } = object(request.body, ['since', 'until']);
      return {
        preview: repository.previewAgentRollback(actor(request), safeId(request.params.id), {
          since: text(since, 'since', 40),
          until: until === undefined ? undefined : text(until, 'until', 40),
        }),
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/v1/agents/:id/rollback',
    { onRequest: requireScope('sync', true) },
    (request) => {
      const { since, until, previewToken } = object(request.body, [
        'since',
        'until',
        'previewToken',
      ]);
      const result = repository.rollbackAgent(actor(request), safeId(request.params.id), {
        since: text(since, 'since', 40),
        until: text(until, 'until', 40),
        previewToken: text(previewToken, 'previewToken', 256),
      });
      notify();
      return { result };
    },
  );
}
