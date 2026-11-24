import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { IntegrationRuntime } from '../connectors/runtime.js';
import { missing } from './access.js';
import { object, safeId } from './validation.js';

export function registerIntegrationRoutes(
  app: FastifyInstance,
  runtime: IntegrationRuntime,
  requireScope: (scope: string, write?: boolean) => (request: FastifyRequest) => Promise<void>,
) {
  app.get('/v1/integrations', { onRequest: requireScope('sync') }, () => ({
    integrations: runtime.status(),
  }));
  app.get('/v1/calendar/agenda', { onRequest: requireScope('sync') }, () => ({
    snapshot: runtime.agenda(),
  }));
  app.post<{ Params: { id: string } }>(
    '/v1/integrations/:id/poll',
    { onRequest: requireScope('sync', true) },
    (request, reply) => {
      object(request.body, []);
      if (!runtime.poll(safeId(request.params.id))) throw missing();
      return reply.code(202).send({ status: 'accepted' });
    },
  );
}
