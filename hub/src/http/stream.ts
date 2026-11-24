import type { FastifyInstance } from 'fastify';
import type { WebsocketHandler } from '@fastify/websocket';
import type { HubRepository } from '../db/index.js';
import { bearerValue, denied, rateLimited, windowLimiter } from './access.js';
import { object } from './validation.js';

type Socket = Parameters<WebsocketHandler>[0];
const MAX_CONNECTIONS = 256;
const AUTH_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 30_000;
const MIN_PING_INTERVAL_MS = 5_000;

interface Session {
  tokenId: string;
  lastSent: number;
  lastPing: number;
}

export function registerStream(
  app: FastifyInstance,
  repository: HubRepository,
  acceptsOrigin: (value: string | undefined) => boolean,
) {
  const sessions = new Map<Socket, Session>();
  const allowHandshake = windowLimiter();
  let connections = 0;

  app.get(
    '/v1/stream',
    {
      websocket: true,
      onRequest: (request, _reply, done) => {
        if (!acceptsOrigin(request.headers.origin)) throw denied();
        if (connections >= MAX_CONNECTIONS || !allowHandshake(request.ip, 120)) throw rateLimited();
        done();
      },
    },
    (socket) => {
      connections++;
      const timeout = setTimeout(() => socket.close(1008), AUTH_TIMEOUT_MS);
      timeout.unref();
      socket.on('error', () => socket.terminate());
      socket.on('close', () => {
        clearTimeout(timeout);
        sessions.delete(socket);
        connections--;
      });
      socket.on('message', (raw, binary) => {
        if (binary || !Buffer.isBuffer(raw)) {
          socket.close(1008);
          return;
        }
        try {
          const parsed: unknown = JSON.parse(raw.toString());
          const session = sessions.get(socket);
          if (session) {
            if (
              object(parsed, ['type']).type !== 'ping' ||
              !repository.isTokenActive(session.tokenId)
            ) {
              throw denied();
            }
            const now = Date.now();
            if (now - session.lastPing >= MIN_PING_INTERVAL_MS) {
              session.lastPing = now;
              socket.send(JSON.stringify({ type: 'pong' }));
            }
            return;
          }
          const { type, token } = object(parsed, ['type', 'token']);
          if (type !== 'authenticate' || typeof token !== 'string') throw denied();
          const record = repository.authenticateToken(bearerValue(`Bearer ${token}`));
          if (!record?.scopes.includes('sync')) throw denied();
          clearTimeout(timeout);
          sessions.set(socket, {
            tokenId: record.id,
            lastSent: repository.latestChangeSeq(),
            lastPing: 0,
          });
          socket.send(JSON.stringify({ type: 'ready' }));
        } catch {
          socket.close(1008);
        }
      });
    },
  );

  const notify = () => {
    if (!sessions.size) return;
    try {
      const seq = repository.latestChangeSeq();
      for (const [socket, session] of sessions) {
        if (socket.readyState !== socket.OPEN) continue;
        if (!repository.isTokenActive(session.tokenId) || socket.bufferedAmount > 64 * 1024) {
          socket.close(1008);
        } else if (seq > session.lastSent) {
          socket.send(JSON.stringify({ type: 'changes', seq }));
          session.lastSent = seq;
        }
      }
    } catch {
      app.log.warn('Hub stream refresh failed');
    }
  };
  const timer = setInterval(notify, HEARTBEAT_MS);
  timer.unref();
  app.addHook('onClose', (_app, done) => {
    clearInterval(timer);
    done();
  });
  return notify;
}
