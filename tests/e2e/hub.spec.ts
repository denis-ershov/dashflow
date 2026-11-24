import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Item } from '../../src/core/items/types';

const extensionBuild = path.join(process.cwd(), '.output', 'chrome-mv3');
const hubBuild = new URL('../../hub/dist/', import.meta.url);
const loopback = 'http://127.0.0.1/*';
const statusKey = 'dashflow:hub-status';
const connectionKey = 'dashflow:hub-connection';

interface Repository {
  close(): void;
  createPairingChallenge(origin: string): { code: string };
  listItems(query: { q: string }): { items: Item[] };
  getItem(id: string, includeDeleted: boolean): Item | undefined;
  listHistory(entity: 'item', id: string): { version: number; value: Item | null }[];
}

type Server = FastifyInstance & { websocketServer: { clients: Set<unknown> } };
type SqliteModule = { openHubRepository: () => Repository };
type HttpModule = {
  createHubServer: (options: {
    repository: Repository;
    extensionOrigins: string[];
  }) => Promise<Server>;
};

const observeStatus = (page: Page) =>
  page.evaluate(async (key) => {
    const saved = await chrome.storage.local.get<{
      [key: string]: { state?: string; issue?: string };
    }>(key);
    return saved[key];
  }, statusKey);

async function loadHub() {
  try {
    const [sqlite, http] = await Promise.all([
      import(new URL('db/index.js', hubBuild).href) as Promise<SqliteModule>,
      import(new URL('http/index.js', hubBuild).href) as Promise<HttpModule>,
    ]);
    return { ...sqlite, ...http };
  } catch (cause) {
    throw new Error('Перед E2E Hub запустите npm run build:hub.', { cause });
  }
}

async function copyExtension(folder: string) {
  const extension = path.join(folder, 'extension');
  await cp(extensionBuild, extension, { recursive: true });
  const file = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(await readFile(file, 'utf8')) as { host_permissions?: string[] };
  // Chromium показывает отдельное окно для необязательного разрешения хоста.
  // Для изолированного профиля выдаём только loopback при загрузке тестовой копии.
  manifest.host_permissions = [...(manifest.host_permissions ?? []), loopback];
  await writeFile(file, JSON.stringify(manifest), 'utf8');
  return extension;
}

function launch(extension: string) {
  return chromium.launchPersistentContext('', {
    channel: 'chromium',
    locale: 'en-US',
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
}

async function openWorkspace(context: BrowserContext) {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const page = await context.newPage();
  await page.goto(`${origin}/newtab.html`);
  await expect(page.getByRole('textbox', { name: 'New task' })).toBeEnabled();
  return { page, origin };
}

async function pair(page: Page, origin: string, code: string) {
  return page.evaluate(
    (data) =>
      chrome.runtime.sendMessage<unknown, { ok: boolean; issue?: string }>({
        type: 'dashflow:hub-pair',
        ...data,
      }),
    { origin, code },
  );
}

function inbox(page: Page) {
  return page.getByRole('region', { name: 'Inbox', exact: true });
}

async function addInbox(page: Page) {
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search workspace and commands' }).fill('Inbox');
  await page.getByRole('option', { name: /Add widget: Inbox/ }).click();
  await expect(inbox(page)).toBeVisible();
}

async function capture(page: Page, title: string) {
  const field = inbox(page).getByRole('textbox', { name: 'New inbox item' });
  await field.fill(title);
  await field.press('Enter');
  await expect(inbox(page).getByText(title, { exact: true })).toBeVisible();
}

async function triage(page: Page, title: string, action: 'Archive' | 'Move to trash') {
  await inbox(page)
    .getByRole('button', { name: `Actions for “${title}”` })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: action, exact: true }).click();
  await expect(inbox(page).getByText(title, { exact: true })).toHaveCount(0);
}

async function localConflict(page: Page, id: string) {
  return page.evaluate(
    (itemId) =>
      new Promise<{ earlier?: { value?: Item } } | undefined>((resolve, reject) => {
        const open = indexedDB.open('dashflow_items');
        open.onerror = () =>
          reject(new Error('Не удалось открыть данные двух версий Item', { cause: open.error }));
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('itemHistory');
          const get = tx.objectStore('itemHistory').get(`item:${itemId}`);
          tx.oncomplete = () => {
            db.close();
            resolve(get.result as { earlier?: { value?: Item } } | undefined);
          };
          tx.onabort = () => {
            db.close();
            reject(new Error('Не удалось прочитать историю Item', { cause: tx.error }));
          };
        };
      }),
    id,
  );
}

test('Hub сопрягает два Chromium-профиля, синхронизирует офлайн-очередь и сохраняет конфликт', async () => {
  test.setTimeout(90_000);
  const { openHubRepository, createHubServer } = await loadHub();
  const folder = await mkdtemp(path.join(tmpdir(), 'dashflow-hub-e2e-'));
  const db = openHubRepository();
  const contexts: BrowserContext[] = [];
  let server: Server | undefined;
  try {
    const extension = await copyExtension(folder);
    const first = await launch(extension);
    contexts.push(first);
    const second = await launch(extension);
    contexts.push(second);
    const [a, b] = await Promise.all([openWorkspace(first), openWorkspace(second)]);
    expect(a.origin).toBe(b.origin);
    await Promise.all([addInbox(a.page), addInbox(b.page)]);

    const pairOrigins: (string | undefined)[] = [];
    const streamOrigins: (string | undefined)[] = [];
    let blockedAuth: string | undefined;
    server = await createHubServer({ repository: db, extensionOrigins: [a.origin] });
    server.addHook('onRequest', (request, reply, done) => {
      const route = request.routeOptions.url;
      if (route === '/v1/pair' && request.method === 'POST')
        pairOrigins.push(request.headers.origin);
      if (route === '/v1/stream') streamOrigins.push(request.headers.origin);
      if (blockedAuth && request.headers.authorization === blockedAuth) {
        void reply.code(503).send();
      } else {
        done();
      }
    });
    const hubOrigin = await server.listen({ host: '127.0.0.1', port: 0 });
    const sockets = server.websocketServer.clients;
    for (const device of [a, b]) {
      const attempt = await pair(
        device.page,
        hubOrigin,
        db.createPairingChallenge(device.origin).code,
      );
      expect({ attempt, origin: pairOrigins.at(-1) }).toEqual({
        attempt: { ok: true },
        origin: device.origin,
      });
      await expect.poll(() => observeStatus(device.page)).toMatchObject({ state: 'connected' });
    }
    await expect.poll(() => sockets.size).toBe(2);
    expect(streamOrigins).toEqual([a.origin, b.origin]);

    const task = 'Conflict fixture task';
    const offlineTask = 'Queued while offline';
    await capture(a.page, task);
    await expect(inbox(b.page).getByText(task, { exact: true })).toBeVisible();
    const item = db.listItems({ q: task }).items[0]!;
    expect(item.version).toBe(1);

    blockedAuth = await a.page.evaluate(async (key) => {
      const result = await chrome.storage.local.get<{ [key: string]: { token?: string } }>(key);
      return `Bearer ${result[key]?.token}`;
    }, connectionKey);
    await triage(a.page, task, 'Archive');
    await capture(a.page, offlineTask);
    await expect
      .poll(() => observeStatus(a.page))
      .toMatchObject({ state: 'offline', issue: 'network' });
    await expect(inbox(b.page).getByText(offlineTask, { exact: true })).toHaveCount(0);
    expect(db.listItems({ q: offlineTask }).items).toEqual([]);

    await triage(b.page, task, 'Move to trash');
    await expect
      .poll(() => db.getItem(item.id, true))
      .toMatchObject({ version: 2, deletedAt: expect.any(String) });
    blockedAuth = undefined;
    expect(
      await a.page.evaluate(() =>
        chrome.runtime.sendMessage<unknown, { ok: boolean }>({ type: 'dashflow:hub-retry' }),
      ),
    ).toEqual({ ok: true });
    await expect.poll(() => observeStatus(a.page)).toMatchObject({ state: 'connected' });
    await expect(inbox(b.page).getByText(offlineTask, { exact: true })).toBeVisible();
    await expect
      .poll(() => db.listHistory('item', item.id))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            version: 2,
            value: expect.objectContaining({ archivedAt: expect.any(String) }),
          }),
        ]),
      );
    await expect
      .poll(() => localConflict(a.page, item.id))
      .toMatchObject({
        earlier: { value: { archivedAt: expect.any(String) } },
      });
    expect(db.getItem(item.id, true)).toMatchObject({ version: 2, deletedAt: expect.any(String) });
  } finally {
    try {
      try {
        await Promise.all(contexts.map((context) => context.close()));
      } finally {
        await server?.close();
      }
    } finally {
      db.close();
      await rm(folder, { recursive: true, force: true });
    }
  }
});
