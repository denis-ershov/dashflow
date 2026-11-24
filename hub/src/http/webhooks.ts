import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Actor, HubRepository } from '../db/index.js';
import { denied, rateLimited, unauthorized, windowLimiter } from './access.js';
import { createDraft, HttpError, idempotencyKey } from './validation.js';

const FIVE_MINUTES = 5 * 60_000;

/** Проверяем точные байты до разбора JSON. Секрет маршрута и ключ подписи независимы. */
export async function registerWebhooks(
  app: FastifyInstance,
  repository: HubRepository,
  writesPerMinute: number,
  notify: () => void,
  identify: (request: FastifyRequest, actor: Actor) => void,
) {
  const allowIp = windowLimiter();
  const allowWebhook = windowLimiter();
  await app.register((routes, _, done) => {
    routes.removeContentTypeParser('application/json');
    routes.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_, body, done) =>
      done(null, body),
    );
    const parseJson = routes.getDefaultJsonParser('error', 'error');

    routes.post<{ Params: { token: string } }>(
      '/v1/webhooks/in/:token',
      {
        onRequest: (request, _reply, next) => {
          if (!allowIp(request.ip, 120)) throw rateLimited();
          if (request.headers.origin !== undefined) throw denied();
          next();
        },
      },
      async (request, reply) => {
        const timestamp = request.headers['x-dashflow-timestamp'];
        const signature = request.headers['x-dashflow-signature'];
        const deliveryHeader = request.headers['x-dashflow-delivery'];
        const token = request.params.token;
        const body = request.body;
        if (
          typeof timestamp !== 'string' ||
          !/^\d{13}$/.test(timestamp) ||
          Math.abs(Date.now() - Number(timestamp)) > FIVE_MINUTES ||
          typeof signature !== 'string' ||
          !/^sha256=[\da-f]{64}$/.test(signature) ||
          typeof deliveryHeader !== 'string' ||
          !/^[\w.-]{1,80}$/.test(deliveryHeader) ||
          !/^[\w-]{16,256}$/.test(token) ||
          !Buffer.isBuffer(body)
        ) {
          throw unauthorized();
        }
        const webhook = repository.getWebhook(token);
        if (!webhook) throw unauthorized();
        const signed = createHmac('sha256', webhook.key)
          .update(`${timestamp}.${deliveryHeader}.`)
          .update(body)
          .digest();
        if (!timingSafeEqual(signed, Buffer.from(signature.slice(7), 'hex'))) throw unauthorized();
        const actor = { id: webhook.id, name: webhook.name, type: 'connector' } as const;
        identify(request, actor);
        if (!allowWebhook(webhook.id, writesPerMinute)) throw rateLimited();

        const data = await new Promise<unknown>((resolve, reject) => {
          void parseJson(request, body.toString('utf8'), (error, parsed: unknown) => {
            if (error) reject(new HttpError(400, 'VALIDATION_FAILED', 'Invalid JSON'));
            else resolve(parsed);
          });
        });
        const item = repository.createItem(
          actor,
          { ...createDraft(data), status: 'inbox', boardId: undefined, order: undefined },
          `webhook.${idempotencyKey(deliveryHeader)}`,
        );
        notify();
        return reply.code(201).send(item);
      },
    );
    done();
  });
}
