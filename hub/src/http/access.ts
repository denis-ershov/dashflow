import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Actor, HubRepository } from '../db/index.js';
import { HttpError } from './validation.js';

export const denied = () => new HttpError(403, 'FORBIDDEN', 'Access denied');
export const missing = () => new HttpError(404, 'NOT_FOUND', 'Resource not found');
export const unauthorized = () => new HttpError(401, 'UNAUTHORIZED', 'Valid credentials required');
export const rateLimited = () => new HttpError(429, 'RATE_LIMITED', 'Request limit exceeded');

const MINUTE_MS = 60_000;
const MAX_RATE_KEYS = 10_000;
export const EXTENSION_ORIGIN =
  /^(?:chrome-extension:\/\/[a-p]{32}|moz-extension:\/\/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12})$/;
const methods = 'GET, POST, PATCH, DELETE, OPTIONS';
const corsHeaders = new Set(['authorization', 'content-type', 'idempotency-key', 'if-match']);

export function windowLimiter() {
  const counts = new Map<string, number>();
  let expiresAt = 0;
  return (key: string, limit: number) => {
    const now = Date.now();
    if (now >= expiresAt) {
      expiresAt = now + MINUTE_MS;
      counts.clear();
    }
    const current = counts.get(key);
    if (current === undefined && counts.size >= MAX_RATE_KEYS) return false;
    const next = (current ?? 0) + 1;
    if (next > limit) return false;
    counts.set(key, next);
    return true;
  };
}

export function originControls(configured: readonly string[]) {
  if (configured.some((origin) => !EXTENSION_ORIGIN.test(origin))) {
    throw new Error('Invalid extension origin in Hub configuration');
  }
  const origins = new Set(configured);
  const allows = (origin: string | undefined) => origin !== undefined && origins.has(origin);
  return {
    allows,
    apply(request: FastifyRequest, reply: FastifyReply) {
      const origin = request.headers.origin;
      reply.header(
        'Vary',
        request.method === 'OPTIONS'
          ? 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
          : 'Origin',
      );
      if (allows(origin)) {
        reply.header('Access-Control-Allow-Origin', origin);
        reply.header('Access-Control-Expose-Headers', 'ETag, Retry-After');
      }
    },
    preflight(request: FastifyRequest, reply: FastifyReply) {
      if (!allows(request.headers.origin)) throw denied();
      const method = request.headers['access-control-request-method'];
      const requested = request.headers['access-control-request-headers'];
      if (
        typeof method !== 'string' ||
        !methods.split(', ').includes(method) ||
        (requested !== undefined &&
          (typeof requested !== 'string' ||
            requested.split(',').some((name) => !corsHeaders.has(name.trim().toLowerCase()))))
      ) {
        throw denied();
      }
      return reply
        .header('Access-Control-Allow-Methods', methods)
        .header('Access-Control-Allow-Headers', [...corsHeaders].join(', '))
        .header('Access-Control-Max-Age', '300')
        .code(204)
        .send();
    },
  };
}

export function bearerValue(value: unknown): string {
  if (typeof value !== 'string') throw unauthorized();
  const match = /^Bearer ([A-Za-z0-9_-]{16,256})$/i.exec(value);
  if (!match?.[1]) throw unauthorized();
  return match[1];
}

export function actorFor(
  record: NonNullable<ReturnType<HubRepository['authenticateToken']>>,
): Actor {
  return {
    type: record.scopes.includes('sync') ? 'user' : 'agent',
    id: record.id,
    name: record.name,
    scopes: record.scopes,
  };
}

export function tokenAccess(repository: HubRepository, writesPerMinute: number) {
  const identities = new WeakMap<FastifyRequest, Actor>();
  const allowWrite = windowLimiter();
  const permitWrite = (tokenId: string) => allowWrite(tokenId, writesPerMinute);
  const allowAuthFailure = windowLimiter();

  const requireScope =
    (scope: string, write = false) =>
    (request: FastifyRequest) => {
      let record: ReturnType<HubRepository['authenticateToken']>;
      try {
        record = repository.authenticateToken(bearerValue(request.headers.authorization));
      } catch (error) {
        if (!(error instanceof HttpError) || error.code !== 'UNAUTHORIZED') throw error;
      }
      if (!record) {
        if (!allowAuthFailure(request.ip, 120)) throw rateLimited();
        throw unauthorized();
      }
      identities.set(request, actorFor(record));
      if (write && !permitWrite(record.id)) throw rateLimited();
      if (!record.scopes.includes(scope)) throw denied();
      return Promise.resolve();
    };
  const actor = (request: FastifyRequest): Actor => {
    const result = identities.get(request);
    if (!result) throw unauthorized();
    return result;
  };
  return { identities, requireScope, actor, permitWrite };
}
