import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Item } from '@dashflow/shared';
import { openHubRepository, type HubRepository } from '../src/db/index.js';
import { createHubServer } from '../src/http/index.js';

const extension = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';
const foreignExtension = 'chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba';
const ownerScopes = ['items:read', 'items:write', 'boards:read', 'boards:write', 'digests:write'];
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe('Hub HTTP API', () => {
  let db: HubRepository;
  let app: FastifyInstance;
  let owner: string;
  let stranger: string;
  let admin: string;
  let sync: string;

  beforeEach(async () => {
    db = openHubRepository();
    app = await createHubServer({ repository: db, extensionOrigins: [extension] });
    owner = db.createToken('Owner', ownerScopes).token;
    stranger = db.createToken('Other', ['items:read', 'items:write']).token;
    admin = db.createToken('Admin', ['items:read', 'items:write', 'items:manage']).token;
    sync = db.createToken('Device', ['sync']).token;
  });

  afterEach(async () => {
    await app?.close();
    db?.close();
  });

  const createItem = (payload = { kind: 'task', title: 'Тестовая задача' }) =>
    app.inject({ method: 'POST', url: '/v1/items', headers: auth(owner), payload });

  it('проверяет доступ и параметры, идемпотентность, версии и мягкое удаление Items', async () => {
    expect((await app.inject('/v1/items')).statusCode).toBe(401);
    expect((await app.inject({ url: '/v1/items', headers: auth(sync) })).statusCode).toBe(403);
    expect((await createItem({ kind: 'other', title: 'Invalid' })).statusCode).toBe(400);
    expect((await app.inject({ url: '/v1/items?limit=0', headers: auth(owner) })).statusCode).toBe(
      400,
    );
    const create = {
      method: 'POST' as const,
      url: '/v1/items',
      headers: { ...auth(owner), 'Idempotency-Key': 'request-1' },
      payload: { kind: 'task', title: 'Тестовая задача' },
    };
    const created = await app.inject(create);
    expect(created.statusCode).toBe(201);
    expect(created.headers.etag).toBe('"1"');
    const item = created.json<Item>();
    expect((await app.inject(create)).json()).toEqual(item);
    expect(
      (await app.inject({ ...create, payload: { kind: 'task', title: 'Другой запрос' } }))
        .statusCode,
    ).toBe(409);
    const path = `/v1/items/${item.id}`;
    expect((await app.inject({ url: path, headers: auth(owner) })).json()).toEqual(item);
    expect(
      (
        await app.inject({ url: '/v1/items?q=Тестовая&kind=task&limit=1', headers: auth(owner) })
      ).json(),
    ).toMatchObject({ items: [item] });
    const patch = {
      method: 'PATCH' as const,
      url: path,
      payload: { status: 'done' },
      headers: { ...auth(owner), 'If-Match': '"1"' },
    };
    expect((await app.inject({ ...patch, headers: auth(owner) })).statusCode).toBe(400);
    expect(
      (await app.inject({ ...patch, headers: { ...patch.headers, ...auth(stranger) } })).statusCode,
    ).toBe(403);
    expect((await app.inject(patch)).headers.etag).toBe('"2"');
    expect((await app.inject(patch)).statusCode).toBe(409);
    expect(
      (await app.inject({ method: 'DELETE', url: path, headers: auth(owner) })).statusCode,
    ).toBe(403);
    expect(
      (await app.inject({ method: 'DELETE', url: path, headers: auth(admin) })).statusCode,
    ).toBe(204);
    expect((await app.inject({ url: path, headers: auth(owner) })).statusCode).toBe(404);
    expect(db.getItem(item.id, true)?.deletedAt).toBeDefined();
  });

  it('проверяет доступ к доскам и публикации дайджеста', async () => {
    const boardRequest = {
      method: 'POST' as const,
      url: '/v1/boards',
      payload: { title: 'Доска' },
    };
    expect((await app.inject({ ...boardRequest, headers: auth(stranger) })).statusCode).toBe(403);
    expect(
      (await app.inject({ ...boardRequest, payload: { title: '' }, headers: auth(owner) }))
        .statusCode,
    ).toBe(400);
    const result = await app.inject({ ...boardRequest, headers: auth(owner) });
    expect(result.statusCode).toBe(201);
    const board = result.json<{ id: string }>();
    const url = `/v1/boards/${board.id}`;
    expect((await app.inject({ url, headers: auth(owner) })).json()).toEqual(board);
    expect((await app.inject({ url: '/v1/boards', headers: auth(owner) })).json()).toMatchObject({
      boards: [board],
    });
    expect(
      (
        await app.inject({
          url,
          method: 'PATCH',
          headers: auth(owner),
          payload: { title: 'Спринт' },
        })
      ).json(),
    ).toMatchObject({ title: 'Спринт' });
    const digestRequest = {
      method: 'POST' as const,
      url: '/v1/digests',
      payload: { title: 'Новости', body: 'Кратко' },
    };
    expect(
      (
        await app.inject({
          ...digestRequest,
          url: '/v1/items',
          headers: auth(stranger),
          payload: { ...digestRequest.payload, kind: 'digest' },
        })
      ).statusCode,
    ).toBe(403);
    expect((await app.inject({ ...digestRequest, headers: auth(stranger) })).statusCode).toBe(403);
    expect(
      (
        await app.inject({
          ...digestRequest,
          payload: { title: 'Пусто', body: '' },
          headers: auth(owner),
        })
      ).statusCode,
    ).toBe(400);
    const digest = await app.inject({ ...digestRequest, headers: auth(owner) });
    expect(digest.statusCode).toBe(201);
    expect(digest.json()).toMatchObject({ kind: 'digest', status: 'unread' });
  });

  it('разрешает точный origin и выдаёт токен по одноразовому коду', async () => {
    const health = await app.inject({ url: '/v1/health', headers: { origin: extension } });
    expect(health.json()).toEqual({ status: 'ok' });
    expect(health.headers['access-control-allow-origin']).toBe(extension);
    expect(
      (await app.inject({ url: '/v1/health', headers: { origin: foreignExtension } })).headers[
        'access-control-allow-origin'
      ],
    ).toBeUndefined();
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/v1/pair',
      headers: {
        origin: extension,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    expect(preflight.statusCode).toBe(204);
    const { code } = db.createPairingChallenge(extension);
    const pair = { method: 'POST' as const, url: '/v1/pair', payload: { code, name: 'Notebook' } };
    expect((await app.inject({ ...pair, headers: { origin: foreignExtension } })).statusCode).toBe(
      403,
    );
    expect(
      (
        await app.inject({
          ...pair,
          payload: { code: 'bad', name: 'Notebook' },
          headers: { origin: extension },
        })
      ).statusCode,
    ).toBe(400);
    const paired = await app.inject({ ...pair, headers: { origin: extension } });
    expect(paired.statusCode).toBe(200);
    expect(db.authenticateToken(paired.json<{ token: string }>().token)?.scopes).toEqual(['sync']);
    expect((await app.inject({ ...pair, headers: { origin: extension } })).statusCode).toBe(401);
  });

  it('синхронизирует два клиента и возвращает победившую версию', async () => {
    const secondClient = db.createToken('Device two', ['sync']).token;
    const item = (await createItem()).json<Item>();
    expect(
      (
        await app.inject({ url: '/v1/changes?since=0&limit=1', headers: auth(secondClient) })
      ).json(),
    ).toMatchObject({
      changes: [{ entity: 'item', op: 'upsert', value: item }],
      nextSince: 1,
      hasMore: false,
    });
    expect((await app.inject({ url: '/v1/changes', headers: auth(owner) })).statusCode).toBe(403);
    const buildPush = (token: string, next: Item, idempotencyKey: string) => ({
      method: 'POST' as const,
      url: '/v1/sync/push',
      headers: auth(token),
      payload: {
        changes: [
          {
            entity: 'item',
            op: 'upsert',
            id: next.id,
            value: next,
            version: next.version,
            idempotencyKey,
          },
        ],
      },
    });
    const winner = { ...item, title: 'Победитель', version: 2 };
    const accepted = await app.inject(buildPush(sync, winner, 'first'));
    expect(accepted.json()).toMatchObject({
      results: [{ applied: true, version: 2, value: winner }],
    });
    const rejected = await app.inject(
      buildPush(secondClient, { ...winner, title: 'Проигравший' }, 'second'),
    );
    expect(rejected.json()).toMatchObject({
      results: [{ applied: false, version: 2, value: winner }],
    });
    expect(
      (await app.inject({ url: '/v1/changes?since=1', headers: auth(secondClient) })).json(),
    ).toMatchObject({ changes: [{ seq: 2, value: winner }], nextSince: 2, hasMore: false });
    const historyPath = `/v1/items/${item.id}/history?limit=1`;
    expect((await app.inject({ url: historyPath, headers: auth(owner) })).statusCode).toBe(403);
    expect((await app.inject({ url: historyPath, headers: auth(sync) })).json()).toMatchObject({
      history: [{ version: 2, value: { title: 'Проигравший' } }],
    });
  });

  it('проверяет подпись точных байтов вебхука и не дублирует доставку', async () => {
    const hook = db.createWebhook('Integration');
    const payload = Buffer.from('{"kind":"note","title":"От интеграции","status":"done"}');
    const timestamp = String(Date.now());
    const delivery = 'evt-1';
    const digest = createHmac('sha256', hook.secret)
      .update(`${timestamp}.${delivery}.`)
      .update(payload)
      .digest('hex');
    const request = {
      method: 'POST' as const,
      url: `/v1/webhooks/in/${hook.token}`,
      payload,
      headers: {
        'content-type': 'application/json',
        'x-dashflow-timestamp': timestamp,
        'x-dashflow-delivery': delivery,
        'x-dashflow-signature': `sha256=${digest}`,
      },
    };
    expect(
      (await app.inject({ ...request, payload: Buffer.concat([payload, Buffer.from(' ')]) }))
        .statusCode,
    ).toBe(401);
    const result = await app.inject(request);
    expect(result.statusCode).toBe(201);
    expect(result.json()).toMatchObject({
      status: 'inbox',
      source: { type: 'connector', id: hook.record.id },
    });
    expect((await app.inject(request)).json()).toEqual(result.json());
    expect(db.revokeWebhook(hook.record.id)).toBe(true);
    expect((await app.inject(request)).statusCode).toBe(401);
  });

  it('ограничивает размер тела и число запросов одного токена', async () => {
    const tooLarge = await app.inject({
      method: 'POST',
      url: '/v1/items',
      headers: auth(owner),
      payload: { kind: 'note', title: 'Big', body: 'x'.repeat(256 * 1024) },
    });
    expect(tooLarge.statusCode).toBe(413);
    await app.close();
    app = await createHubServer({ repository: db, writesPerMinute: 1 });
    expect((await createItem()).statusCode).toBe(201);
    expect((await createItem()).statusCode).toBe(429);
    expect((await app.inject({ url: '/v1/items', headers: auth(owner) })).statusCode).toBe(200);
  });

  it('передаёт сигнал изменений только после проверки sync-токена', async () => {
    await app.ready();
    await expect(
      app.injectWS('/v1/stream', { headers: { origin: foreignExtension } }),
    ).rejects.toThrow();
    const denied = await app.injectWS('/v1/stream', { headers: { origin: extension } });
    const closed = new Promise<number>((resolve) => denied.once('close', resolve));
    denied.send(JSON.stringify({ type: 'authenticate', token: owner }));
    expect(await closed).toBe(1008);
    const socket = await app.injectWS('/v1/stream', { headers: { origin: extension } });
    const nextMessage = () =>
      new Promise<unknown>((resolve) =>
        socket.once('message', (data) => {
          resolve(Buffer.isBuffer(data) ? (JSON.parse(data.toString()) as unknown) : data);
        }),
      );
    const ready = nextMessage();
    socket.send(JSON.stringify({ type: 'authenticate', token: sync }));
    expect(await ready).toEqual({ type: 'ready' });
    const pong = nextMessage();
    socket.send(JSON.stringify({ type: 'ping' }));
    expect(await pong).toEqual({ type: 'pong' });
    const changed = nextMessage();
    expect((await createItem()).statusCode).toBe(201);
    expect(await changed).toEqual({ type: 'changes', seq: 1 });
    const revoked = new Promise<number>((resolve) => socket.once('close', resolve));
    const device = db.authenticateToken(sync);
    expect(device && db.revokeToken(device.id)).toBe(true);
    socket.send(JSON.stringify({ type: 'ping' }));
    expect(await revoked).toBe(1008);
  });

  it('обрабатывает 1 000 авторизованных запросов чтения за минуту', async () => {
    const start = performance.now();
    let count = 0;
    for (let batch = 0; batch < 10; batch++) {
      const responses = await Promise.all(
        Array.from({ length: 100 }, () => app.inject({ url: '/v1/items', headers: auth(owner) })),
      );
      count += responses.filter(({ statusCode }) => statusCode === 200).length;
    }
    expect(count).toBe(1_000);
    expect(performance.now() - start).toBeLessThan(60_000);
  }, 60_000);
});
