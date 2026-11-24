import type { IncomingMessage, ServerResponse } from 'node:http';
import { HUB_BODY_LIMIT } from '@dashflow/shared';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { HubRepository } from '../db/index.js';
import { bearerValue, windowLimiter } from '../http/access.js';
import { HttpError } from '../http/validation.js';
import type { McpLocale } from './messages.js';
import { createDashflowMcp, type DashflowMcpOptions } from './server.js';
import { WorkspaceError } from './workspace.js';

export async function startMcpStdio(options: DashflowMcpOptions) {
  const server = createDashflowMcp(options);
  await server.connect(
    new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: HUB_BODY_LIMIT }),
  );
  return server;
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const RPC_ERRORS = {
  400: [-32600, 'Invalid MCP request'],
  401: [-32000, 'Valid credentials required'],
  403: [-32000, 'MCP access denied'],
  405: [-32000, 'MCP transport accepts POST'],
  413: [-32000, 'MCP request body exceeds 256 KiB'],
  415: [-32000, 'Expected application/json'],
  429: [-32000, 'MCP request limit exceeded'],
  500: [-32603, 'Internal MCP error'],
} as const;

type Status = keyof typeof RPC_ERRORS;
class TransportError extends Error {
  constructor(readonly status: Status) {
    super(RPC_ERRORS[status][1]);
  }
}

function sendError(response: ServerResponse, status: Status) {
  if (response.headersSent) {
    if (!response.writableEnded) response.end();
    return;
  }
  const [code, message] = RPC_ERRORS[status];
  if (status === 401) response.setHeader('WWW-Authenticate', 'Bearer');
  if (status === 405) response.setHeader('Allow', 'POST');
  if (status === 429) response.setHeader('Retry-After', '60');
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code, message } }));
}

function authority(value: unknown) {
  if (typeof value !== 'string') return;
  const match = /^([\w.-]+|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.exec(value);
  const hostname = match?.[1]?.toLowerCase();
  if (!hostname) return;
  try {
    const parsed = new URL(`http://${value}`);
    if (hostname === parsed.hostname) return { raw: value.toLowerCase(), hostname };
  } catch {
    return undefined;
  }
}

function configuredHost(value: string) {
  const host = authority(value);
  if (!host) throw new Error('Некорректный Host в настройках MCP');
  return host.raw;
}

function configuredOrigin(value: string) {
  const url = new URL(value);
  if (
    !authority(url.host) ||
    value !== `${url.protocol}//${url.host}` ||
    !['http:', 'https:', 'chrome-extension:', 'moz-extension:'].includes(url.protocol)
  ) {
    throw new Error('Некорректный Origin в настройках MCP');
  }
  return value;
}

function locale(headers: IncomingMessage['headers']): McpLocale {
  const value = headers['accept-language']?.split(',')[0]?.trim();
  return /^ru(?:[-;]|$)/i.test(value ?? '') ? 'ru' : 'en';
}

async function requestBody(request: IncomingMessage, parsed: unknown) {
  const contentType = request.headers['content-type'];
  if (
    typeof contentType !== 'string' ||
    contentType.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  ) {
    throw new TransportError(415);
  }
  const declared = Number(request.headers['content-length']);
  if (declared > HUB_BODY_LIMIT) throw new TransportError(413);
  if (parsed !== undefined) {
    if (Buffer.byteLength(JSON.stringify(parsed)) > HUB_BODY_LIMIT) throw new TransportError(413);
    return parsed;
  }
  const parts: Buffer[] = [];
  let total = 0;
  for await (const value of request.iterator({ destroyOnReturn: false })) {
    const chunk: unknown = value;
    if (!Buffer.isBuffer(chunk)) throw new TransportError(400);
    total += chunk.byteLength;
    if (total > HUB_BODY_LIMIT) {
      request.resume();
      throw new TransportError(413);
    }
    parts.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(parts, total).toString('utf8')) as unknown;
  } catch {
    throw new TransportError(400);
  }
}

export interface McpHttpOptions {
  repository: HubRepository;
  allowedHosts?: readonly string[];
  allowedOrigins?: readonly string[];
  writesPerMinute?: number;
  allowWrite?: (tokenId: string) => boolean;
}

/** Обработчик /mcp без серверных сессий. Родитель может передать общий лимит REST/MCP. */
export function createMcpHttpHandler({
  repository,
  allowedHosts = LOCAL_HOSTS,
  allowedOrigins = [],
  writesPerMinute = 60,
  allowWrite,
}: McpHttpOptions) {
  if (!Number.isSafeInteger(writesPerMinute) || writesPerMinute < 1 || writesPerMinute > 10_000) {
    throw new Error('Некорректный лимит записи MCP');
  }
  const hosts = new Set(allowedHosts.map(configuredHost));
  const origins = new Set(allowedOrigins.map(configuredOrigin));
  const allowRequest = windowLimiter();
  const allowMutate = windowLimiter();
  const permitWrite = allowWrite ?? ((tokenId: string) => allowMutate(tokenId, writesPerMinute));

  return async (
    request: IncomingMessage,
    response: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const host = authority(request.headers.host);
      const origin = request.headers.origin;
      if (
        !host ||
        (!hosts.has(host.raw) && !hosts.has(host.hostname)) ||
        (origin !== undefined && !origins.has(origin))
      )
        throw new TransportError(403);
      if (!allowRequest(request.socket.remoteAddress ?? '', 1_200)) throw new TransportError(429);
      const token = bearerValue(request.headers.authorization);
      const server = createDashflowMcp({
        repository,
        token,
        locale: locale(request.headers),
        allowWrite: permitWrite,
      });
      try {
        if (request.method !== 'POST') throw new TransportError(405);
        const body = await requestBody(request, parsedBody);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });
        await server.connect(transport);
        await transport.handleRequest(request, response, body);
      } finally {
        await server.close();
      }
    } catch (error) {
      if (error instanceof TransportError) sendError(response, error.status);
      else if (
        (error instanceof HttpError && error.code === 'UNAUTHORIZED') ||
        (error instanceof WorkspaceError && error.code === 'UNAUTHORIZED')
      )
        sendError(response, 401);
      else sendError(response, 500);
    }
  };
}
