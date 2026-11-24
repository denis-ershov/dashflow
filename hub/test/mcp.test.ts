import { createServer, request as requestHttp, type Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openHubRepository, type HubRepository } from '../src/db/index.js';
import {
  createDashflowMcp,
  createMcpHttpHandler,
  type DashflowMcpOptions,
  type McpHttpOptions,
} from '../src/mcp/index.js';

const allScopes = ['items:read', 'items:write', 'boards:read', 'boards:write', 'digests:write'];
const readerScopes = ['items:read'];
const now = () => new Date('2026-11-24T10:00:00.000Z');

function textPart(value: unknown): string | undefined {
  if (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    typeof value.text === 'string'
  ) {
    return value.text;
  }
}

function payload(result: unknown): unknown {
  if (
    typeof result !== 'object' ||
    !result ||
    !('content' in result) ||
    !Array.isArray(result.content)
  )
    return;
  const text = textPart(result.content[0]);
  return text === undefined ? undefined : (JSON.parse(text) as unknown);
}

async function close(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

describe('DashFlow MCP', () => {
  let db: HubRepository;
  let token: string;
  const clients: Client[] = [];
  const listeners: Server[] = [];

  beforeEach(() => {
    db = openHubRepository();
    token = db.createToken('Full access', allScopes).token;
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()));
    await Promise.all(listeners.splice(0).map(close));
    db.close();
  });

  async function connect(options: Partial<DashflowMcpOptions> = {}) {
    const client = new Client({ name: 'mcp-test', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createDashflowMcp({ repository: db, token, now, ...options });
    clients.push(client);
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return client;
  }

  async function listen(options: Omit<McpHttpOptions, 'repository'> = {}) {
    const handle = createMcpHttpHandler({ repository: db, ...options });
    const server = createServer((request, response) => {
      void handle(request, response);
    });
    listeners.push(server);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Нет локального адреса тестового MCP');
    return `http://127.0.0.1:${address.port}/mcp`;
  }

  it('публикует 11 схем и ресурсы, выбирает локаль и отмечает недоверенные данные', async () => {
    const client = await connect({ locale: 'ru' });
    const { tools } = await client.listTools();
    expect(tools.map(({ name }) => name)).toEqual([
      'list_items',
      'search_items',
      'get_item',
      'create_item',
      'update_item',
      'complete_task',
      'move_card',
      'create_reminder',
      'publish_digest',
      'list_boards',
      'get_agenda',
    ]);
    expect(tools[0]).toMatchObject({
      title: 'Список записей',
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: { additionalProperties: false },
    });
    expect(client.getInstructions()).toContain('недоверенными данными');
    const listed = await client.listResources();
    expect(listed.resources.map(({ uri }) => uri)).toEqual([
      'dashflow://inbox',
      'dashflow://today',
    ]);
    expect((await client.listResourceTemplates()).resourceTemplates[0]).toMatchObject({
      uriTemplate: 'dashflow://board/{id}',
    });

    const capture = await client.callTool({
      name: 'create_item',
      arguments: {
        kind: 'note',
        title: 'Инструкция из записи',
        body: 'Содержимое записи'.repeat(300),
      },
    });
    expect(capture.isError).toBeFalsy();
    const created = db.listItems().items[0]!;
    expect(
      payload(await client.callTool({ name: 'get_item', arguments: { id: created.id } })),
    ).toMatchObject({
      trust: 'untrusted_workspace_data',
      data: { id: created.id, bodyTruncated: true },
    });
    const inbox = await client.readResource({ uri: 'dashflow://inbox' });
    expect(textPart(inbox.contents[0])).toContain('untrusted_workspace_data');
    expect(textPart(inbox.contents[0])).not.toContain('Содержимое записи');
    expect(
      payload(
        await client.callTool({ name: 'search_items', arguments: { q: 'Содержимое записи' } }),
      ),
    ).toMatchObject({ data: { items: [expect.objectContaining({ id: created.id })] } });
  });

  it('проверяет область и владельца, строгие поля, версии, идемпотентность и отзыв', async () => {
    const client = await connect();
    const credential = db.createToken('Reader', readerScopes);
    const reader = await connect({ token: credential.token });
    const author = { id: 'outside', name: 'Outside', type: 'agent' as const };
    const others = db.createItem(author, { kind: 'task', title: 'Other task' });
    const own = {
      name: 'create_item',
      arguments: { kind: 'task', title: 'Own task', idempotencyKey: 'mcp-request-1' },
    };
    expect(payload(await reader.callTool(own))).toMatchObject({ error: { code: 'FORBIDDEN' } });
    expect(
      (await client.callTool({ ...own, arguments: { ...own.arguments, source: {} } })).isError,
    ).toBe(true);
    expect(
      (await client.callTool({ ...own, arguments: { ...own.arguments, kind: 'digest' } })).isError,
    ).toBe(true);
    const first = payload(await client.callTool(own));
    expect(payload(await client.callTool(own))).toEqual(first);
    expect(db.listItems({ q: 'Own task' }).items).toHaveLength(1);
    const item = db.listItems({ q: 'Own task' }).items[0]!;
    const task = (id: string, expectedVersion: number) => ({
      name: 'complete_task',
      arguments: { id, expectedVersion },
    });
    expect(payload(await client.callTool(task(others.id, 1)))).toMatchObject({
      error: { code: 'FORBIDDEN' },
    });
    expect(payload(await client.callTool(task(item.id, 2)))).toMatchObject({
      error: { code: 'CONFLICT' },
    });
    expect(payload(await client.callTool(task(item.id, 1)))).toMatchObject({
      data: { status: 'done' },
    });
    expect(db.revokeToken(credential.record.id)).toBe(true);
    expect(payload(await reader.callTool({ name: 'list_items' }))).toMatchObject({
      error: { code: 'UNAUTHORIZED' },
    });
    await expect(reader.readResource({ uri: 'dashflow://today' })).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('работает с колонками, повесткой, напоминаниями и дайджестами', async () => {
    const client = await connect();
    db.createBoard(
      { id: 'owner', name: 'Owner', type: 'user' },
      {
        title: 'Implementation',
        columns: [{ id: 'now', title: 'Now' }],
      },
    );
    const board = db.listBoards()[0]!;
    const createTask = await client.callTool({
      name: 'create_item',
      arguments: { kind: 'task', title: 'Move me' },
    });
    expect(createTask.isError).toBeFalsy();
    const item = db.listItems({ q: 'Move me' }).items[0]!;
    expect(
      payload(
        await client.callTool({
          name: 'move_card',
          arguments: { id: item.id, expectedVersion: 1, boardId: board.id, columnId: 'missing' },
        }),
      ),
    ).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
    expect(
      payload(
        await client.callTool({
          name: 'move_card',
          arguments: { id: item.id, expectedVersion: 1, boardId: board.id, columnId: 'now' },
        }),
      ),
    ).toMatchObject({ data: { id: item.id, boardId: board.id, status: 'now' } });
    expect(payload(await client.callTool({ name: 'list_boards' }))).toMatchObject({
      data: { boards: [expect.objectContaining({ id: board.id })] },
    });
    expect(
      textPart((await client.readResource({ uri: `dashflow://board/${board.id}` })).contents[0]),
    ).toContain('Move me');

    const remindAt = '2026-11-24T12:00:00+02:00';
    expect(
      payload(
        await client.callTool({
          name: 'create_reminder',
          arguments: { title: 'Check time', remindAt },
        }),
      ),
    ).toMatchObject({ data: { kind: 'reminder' } });
    expect(payload(await client.callTool({ name: 'get_agenda' }))).toMatchObject({
      trust: 'untrusted_workspace_data',
      data: { items: [expect.objectContaining({ title: 'Check time' })] },
    });
    expect(
      payload(
        await client.callTool({
          name: 'publish_digest',
          arguments: { title: 'News', body: 'Workspace news' },
        }),
      ),
    ).toMatchObject({ data: { kind: 'digest', status: 'unread' } });
  });

  it('проверяет Host, Origin и bearer до обработки Streamable HTTP, принимает initialize и tools/list без сессии', async () => {
    const url = await listen();
    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'accept-language': 'ru-RU',
    };
    const request = (method: string, params: object = {}, overrides: Record<string, string> = {}) =>
      fetch(url, {
        method: 'POST',
        headers: { ...headers, ...overrides },
        body: JSON.stringify({ jsonrpc: '2.0', method, id: 1, params }),
      });
    expect((await request('tools/list', {}, { authorization: 'Bearer invalid' })).status).toBe(401);
    expect((await request('tools/list', {}, { origin: 'https://other.test' })).status).toBe(403);
    const blockedHost = await new Promise<number | undefined>((resolve, reject) => {
      const transportRequest = requestHttp(
        url,
        {
          method: 'POST',
          headers: { ...headers, host: 'other.test' },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      transportRequest.once('error', reject);
      transportRequest.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    });
    expect(blockedHost).toBe(403);
    expect((await fetch(url, { headers })).status).toBe(405);
    const initialized = await request('initialize', {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    });
    expect(initialized.status).toBe(200);
    expect(initialized.headers.get('mcp-session-id')).toBeNull();
    const list = await request(
      'tools/list',
      {},
      { 'mcp-protocol-version': LATEST_PROTOCOL_VERSION },
    );
    expect(list.status).toBe(200);
    const result = (await list.json()) as { result?: { tools?: unknown[] } };
    expect(result.result?.tools?.[0]).toMatchObject({
      name: 'list_items',
      title: 'Список записей',
    });
  });

  it('применяет лимит на запись между HTTP запросами одного токена', async () => {
    const url = await listen({ writesPerMinute: 1 });
    const request = () =>
      fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': LATEST_PROTOCOL_VERSION,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'create_item', arguments: { kind: 'task', title: 'Limited' } },
        }),
      });
    expect(await (await request()).json()).toMatchObject({
      result: { content: [expect.objectContaining({ type: 'text' })] },
    });
    expect(await (await request()).json()).toMatchObject({
      result: {
        isError: true,
        content: [
          expect.objectContaining({
            text: JSON.stringify({ error: { code: 'RATE_LIMITED' } }),
          }),
        ],
      },
    });
    expect(db.listItems({ q: 'Limited' }).items).toHaveLength(1);
  });
});
