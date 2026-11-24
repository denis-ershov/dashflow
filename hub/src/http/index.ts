import Fastify, { type FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { HUB_BODY_LIMIT } from '@dashflow/shared';
import { HubDbError, type HubRepository } from '../db/index.js';
import {
  actorFor,
  denied,
  missing,
  originControls,
  rateLimited,
  tokenAccess,
  unauthorized,
  windowLimiter,
} from './access.js';
import { registerRestRoutes } from './rest.js';
import { registerStream } from './stream.js';
import { HttpError, invalid, itemValidationError, object, text } from './validation.js';
import { registerWebhooks } from './webhooks.js';

export interface HubServerOptions {
  repository: HubRepository;
  extensionOrigins?: readonly string[];
  writesPerMinute?: number;
}

const errorStatus = {
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  FORBIDDEN: 403,
} as const;
const safeMessages = {
  VALIDATION_FAILED: 'Invalid request',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Request conflicts with current state',
  FORBIDDEN: 'Access denied',
} as const;

function publicError(error: unknown) {
  if (error instanceof HttpError) return error;
  if (error instanceof HubDbError) {
    return new HttpError(
      errorStatus[error.code],
      error.code,
      safeMessages[error.code],
      error.details,
    );
  }
  const sharedError = itemValidationError(error);
  if (sharedError) return sharedError;
  const status =
    error !== null && typeof error === 'object' && 'statusCode' in error ? error.statusCode : 500;
  if (status === 413)
    return new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 256 KiB');
  if (status === 415)
    return new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected application/json');
  if (status === 400) return new HttpError(400, 'VALIDATION_FAILED', 'Invalid request');
  return new HttpError(500, 'INTERNAL_ERROR', 'Internal server error');
}

export async function createHubServer({
  repository,
  extensionOrigins = [],
  writesPerMinute = 60,
}: HubServerOptions): Promise<FastifyInstance> {
  if (!Number.isSafeInteger(writesPerMinute) || writesPerMinute < 1 || writesPerMinute > 10_000) {
    throw new Error('Invalid write rate limit in Hub configuration');
  }
  const origin = originControls(extensionOrigins);
  const app = Fastify({
    bodyLimit: HUB_BODY_LIMIT,
    routerOptions: { maxParamLength: 256 },
    requestTimeout: 15_000,
    connectionTimeout: 15_000,
    logger: false,
    trustProxy: false,
  });
  const access = tokenAccess(repository, writesPerMinute);
  const allowPair = windowLimiter();
  const allowGlobalPair = windowLimiter();

  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
    origin.apply(request, reply);
  });
  app.setErrorHandler((unknownError, _request, reply) => {
    const error = publicError(unknownError);
    if (error.status === 500) app.log.error('Hub request failed');
    if (error.status === 401) reply.header('WWW-Authenticate', 'Bearer');
    if (error.status === 429) reply.header('Retry-After', '60');
    return reply.code(error.status).send({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    });
  });
  const allowRejectedAudit = windowLimiter();
  const allowGlobalRejectedAudit = windowLimiter();
  app.addHook('onResponse', async (request, reply) => {
    const path = request.routeOptions.url;
    if (!path || !['POST', 'PATCH', 'DELETE'].includes(request.method)) return;
    const authenticated = access.identities.get(request);
    const failed = reply.statusCode >= 400;
    if (
      failed &&
      (!allowRejectedAudit(request.ip, 120) || !allowGlobalRejectedAudit('rejected', 1_000))
    )
      return;
    try {
      repository.recordAudit({
        actorId: authenticated?.id ?? 'anonymous',
        action: `http:${request.method}:${path}`,
        outcome: failed ? 'denied' : 'ok',
      });
    } catch {
      app.log.error('Hub audit write failed');
    }
  });
  app.setNotFoundHandler((_, reply) => {
    const error = missing();
    return reply.code(error.status).send({ error: { code: error.code, message: error.message } });
  });

  await app.register(websocket, { options: { maxPayload: 1024, perMessageDeflate: false } });
  const notify = registerStream(app, repository, origin.allows);
  app.options('/v1/*', (request, reply) => origin.preflight(request, reply));
  app.get('/v1/health', () => ({ status: 'ok' }));
  app.post(
    '/v1/pair',
    {
      onRequest: (request, _reply, done) => {
        if (!origin.allows(request.headers.origin)) throw denied();
        if (!allowPair(request.ip, 10) || !allowGlobalPair('pair', 30)) throw rateLimited();
        done();
      },
    },
    (request) => {
      const { code, name } = object(request.body, ['code', 'name']);
      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return invalid('code');
      const paired = repository.consumePairingChallenge(
        code,
        text(name, 'name', 100),
        request.headers.origin,
      );
      if (!paired) throw unauthorized();
      access.identities.set(request, actorFor(paired.record));
      return { token: paired.token };
    },
  );

  registerRestRoutes(app, repository, access, notify);
  await registerWebhooks(app, repository, writesPerMinute, notify, (request, identity) => {
    access.identities.set(request, identity);
  });
  return app;
}
