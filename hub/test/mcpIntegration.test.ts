import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { openHubRepository, type Actor, type HubRepository } from '../src/db/index.js';
import { createHubServer } from '../src/http/index.js';

const run = promisify(execFile);
const hub = fileURLToPath(new URL('..', import.meta.url));
const scopes = ['items:read', 'items:write'];
const owner: Actor = { id: 'test-owner', name: 'Owner', type: 'user', scopes: ['sync'] };
const extension = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';

async function removeFixture(parent: string, directory?: string) {
  if (!directory) return;
  const target = resolve(directory);
  if (dirname(target) !== resolve(parent)) throw new Error('Некорректный путь тестовой папки');
  await rm(target, { recursive: true, force: true });
}

async function connect(transport: StdioClientTransport | StreamableHTTPClientTransport) {
  const client = new Client({ name: 'dashflow-integration', version: '1.0.0' });
  await client.connect(transport, { timeout: 5_000 });
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 5_000 });
  const content = result.content;
  const first: unknown = Array.isArray(content) ? content[0] : undefined;
  if (
    first === null ||
    typeof first !== 'object' ||
    !('type' in first) ||
    first.type !== 'text' ||
    !('text' in first) ||
    typeof first.text !== 'string'
  ) {
    throw new Error('MCP не вернул текстовый результат');
  }
  return { isError: result.isError ?? false, value: JSON.parse(first.text) as unknown };
}

describe('Интеграция MCP с Hub', () => {
  let build: string | undefined;
  let fixture: string | undefined;
  let db: HubRepository | undefined;
  let app: FastifyInstance | undefined;
  let transport: StdioClientTransport | StreamableHTTPClientTransport | undefined;

  beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'dashflow-mcp-'));
    db = openHubRepository(join(fixture, 'hub.sqlite'));
  });

  afterEach(async () => {
    try {
      await transport?.close();
    } finally {
      try {
        await app?.close();
      } finally {
        db?.close();
        await removeFixture(tmpdir(), fixture);
        db = app = transport = fixture = undefined;
      }
    }
  });

  function repository() {
    if (!db) throw new Error('Тестовая база не открыта');
    return db;
  }

  it('подключает SDK через Fastify и применяет общий лимит записи REST и MCP', async () => {
    const repositoryDb = repository();
    const credential = repositoryDb.createToken('HTTP agent', scopes);
    const authorization = `Bearer ${credential.token}`;
    app = await createHubServer({ repository: repositoryDb, writesPerMinute: 1 });
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const url = new URL('/mcp', address);
    const blocked = await fetch(url, { headers: { authorization, origin: extension } });
    expect(blocked.status).toBe(403);
    await blocked.body?.cancel();
    const guest = await fetch(url);
    expect(guest.status).toBe(401);
    expect(guest.headers.get('www-authenticate')).toBe('Bearer');
    await guest.body?.cancel();

    transport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { authorization, 'accept-language': 'ru-RU' } },
    });
    const client = await connect(transport);
    expect(transport.sessionId).toBeUndefined();
    expect((await client.listTools()).tools[0]).toMatchObject({
      name: 'list_items',
      title: 'Список записей',
    });
    expect(await call(client, 'create_item', { kind: 'task', title: 'Из MCP' })).toMatchObject({
      isError: false,
      value: { data: { title: 'Из MCP' } },
    });
    const rest = await fetch(new URL('/v1/items', address), {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'task', title: 'Из REST' }),
    });
    expect(rest.status).toBe(429);
    expect(rest.headers.get('retry-after')).toBe('60');
    await rest.body?.cancel();
    expect(repositoryDb.listItems().items).toHaveLength(1);
  });

  describe('CLI через stdio', () => {
    beforeAll(async () => {
      // Размещение рядом с исходниками позволяет Node найти зависимости workspace.
      build = await mkdtemp(join(hub, '.mcp-integration-'));
      const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
      await run(process.execPath, [tsc, '-p', 'tsconfig.build.json', '--outDir', build], {
        cwd: hub,
        timeout: 25_000,
      });
    }, 30_000);

    afterAll(async () => {
      await removeFixture(hub, build);
    });

    it('выдаёт агенту его задачи, записывает ответ в SQLite и учитывает отзыв токена', async () => {
      if (!fixture || !build) throw new Error('Тестовые пути не подготовлены');
      const repositoryDb = repository();
      const credential = repositoryDb.createToken('Stdio agent', scopes);
      const other = repositoryDb.createToken('Other agent', scopes);
      const assigned = repositoryDb.createItem(owner, {
        kind: 'task',
        title: 'Задача агента',
        status: 'todo',
        assignee: `agent:${credential.record.id}`,
      });
      const otherTask = repositoryDb.createItem(owner, {
        kind: 'task',
        title: 'Задача другого агента',
        status: 'todo',
        assignee: `agent:${other.record.id}`,
      });
      transport = new StdioClientTransport({
        command: process.execPath,
        args: [join(build, 'cli.js'), 'mcp'],
        cwd: fixture,
        env: {
          DASHFLOW_HUB_CONFIG: join(fixture, 'config.json'),
          DASHFLOW_HUB_DB_PATH: join(fixture, 'hub.sqlite'),
          DASHFLOW_HUB_TOKEN: credential.token,
          DASHFLOW_HUB_MCP_LOCALE: 'ru',
        },
      });
      const client = await connect(transport);
      let transportErrors = 0;
      client.onerror = () => transportErrors++;
      expect((await client.listTools()).tools[0]?.title).toBe('Список записей');
      expect(await call(client, 'list_items', { assignee: 'me' })).toMatchObject({
        isError: false,
        value: {
          trust: 'untrusted_workspace_data',
          data: { items: [expect.objectContaining({ id: assigned.id })] },
        },
      });
      expect(
        await call(client, 'update_item', {
          id: otherTask.id,
          expectedVersion: 1,
          patch: { status: 'doing' },
        }),
      ).toMatchObject({ isError: true, value: { error: { code: 'FORBIDDEN' } } });
      expect(
        await call(client, 'update_item', {
          id: assigned.id,
          expectedVersion: 1,
          patch: { status: 'doing', agentComment: 'Принято в работу' },
        }),
      ).toMatchObject({ isError: false, value: { data: { status: 'doing', version: 2 } } });
      expect(repositoryDb.getItem(assigned.id)).toMatchObject({
        status: 'doing',
        version: 2,
        agentComment: 'Принято в работу',
        source: { id: credential.record.id },
      });
      expect(repositoryDb.revokeToken(credential.record.id)).toBe(true);
      expect(await call(client, 'list_items', { assignee: 'me' })).toMatchObject({
        isError: true,
        value: { error: { code: 'UNAUTHORIZED' } },
      });
      expect(transportErrors).toBe(0);
    });
  });
});
