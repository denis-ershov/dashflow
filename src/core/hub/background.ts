import { browser } from 'wxt/browser';
import { subscribeItemsChanged } from '@/core/items/events';
import { hubSyncStore } from '@/core/items/hubSyncStore';
import { asRecord } from '@/core/network/jsonReaders';
import { hasBrowserPermissions, originPatternFor } from '@/core/permissions/browserPermissions';
import type { Item } from '@/core/items/types';
import {
  fetchHubAgents,
  fetchHubCalendar,
  fetchHubIntegrations,
  getHubEarlierItem,
  HubClientError,
  pollHubIntegration,
  previewHubAgentRollback,
  redeemHubCode,
  revokeHubAgent,
  rollbackHubAgent,
} from './client';
import {
  HUB_AGENTS,
  HUB_AGENT_PREVIEW,
  HUB_AGENT_REVOKE,
  HUB_AGENT_ROLLBACK,
  isAgentId,
  type HubAgentRecord,
  type HubAgentRollbackPreview,
  type HubAgentRollbackResult,
} from './agents';
import {
  HUB_CALENDAR_AGENDA,
  HUB_INTEGRATION_POLL,
  HUB_INTEGRATIONS,
  INTEGRATION_IDS,
  type HubIntegrationStatus,
  type readHubCalendar,
} from './integrations';
import {
  HUB_CONNECTION_KEY,
  HUB_DISCONNECT,
  HUB_DISCONNECTED,
  HUB_HISTORY,
  HUB_PAIR,
  HUB_RETRY,
  HUB_STATUS_KEY,
  HUB_TAB,
  normalizeHubOrigin,
  readHubConnection,
  readHubStatus,
  type HubConnection,
  type HubFailure,
  type HubStatus,
} from './model';
import { subscribeHubStream } from './stream';
import { createHubSyncEngine } from './synchronize';

const POLL_ALARM = 'dashflow-hub-poll';
const RETRY_ALARM = 'dashflow-hub-retry';
const POLL_MINUTES = 5;
const BACKOFF_MAX = 5 * 60_000;
const BACKOFF_INITIAL = 30_000;
type HubReply =
  | {
      ok: true;
      item?: Item;
      agents?: HubAgentRecord[];
      agent?: HubAgentRecord;
      preview?: HubAgentRollbackPreview;
      result?: HubAgentRollbackResult;
      integrations?: HubIntegrationStatus[];
      snapshot?: ReturnType<typeof readHubCalendar>;
    }
  | { ok: false; issue: HubFailure };

const AGENT_REQUESTS = new Set<unknown>([
  HUB_AGENTS,
  HUB_AGENT_REVOKE,
  HUB_AGENT_PREVIEW,
  HUB_AGENT_ROLLBACK,
]);

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

const readConnection = async () =>
  readHubConnection((await browser.storage.local.get(HUB_CONNECTION_KEY))[HUB_CONNECTION_KEY]);
const setStatus = (status: HubStatus) => browser.storage.local.set({ [HUB_STATUS_KEY]: status });
const issueOf = (error: unknown): HubFailure =>
  error instanceof HubClientError ? error.issue : 'data';

async function assertHostPermission(origin: string) {
  const pattern = originPatternFor(origin);
  if (!pattern || !(await hasBrowserPermissions({ origins: [pattern] }))) {
    throw new HubClientError('permissions');
  }
}

export function startHubBackground() {
  const sync = createHubSyncEngine();
  const pageUrl = browser.runtime.getURL('/newtab.html');
  let socket: { connectionId: string; close: () => void } | undefined;
  let socketsRetryAt = 0;
  const tabs = new Set<unknown>();
  let running: Promise<void> | undefined;
  let more = false;
  let controlsBusy = false;
  let delay = BACKOFF_INITIAL;

  function stopStream() {
    socket?.close();
    socket = undefined;
  }

  async function ensurePoll() {
    if (!(await browser.alarms.get(POLL_ALARM))) {
      await browser.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
    }
  }

  async function reportFailure(connection: HubConnection, status: HubStatus, issue: HubFailure) {
    const offline = issue === 'network';
    const retryAt = offline ? Date.now() + delay : undefined;
    await setStatus({
      state: offline ? 'offline' : 'error',
      origin: connection.origin,
      lastSync: status.lastSync,
      issue,
      retryAt,
    });
    if (retryAt) {
      delay = Math.min(delay * 2, BACKOFF_MAX);
      await browser.alarms.create(RETRY_ALARM, { when: retryAt });
    }
  }

  function ensureStream(connection: HubConnection) {
    if (!tabs.size || Date.now() < socketsRetryAt || socket?.connectionId === connection.id) return;
    stopStream();
    const close = subscribeHubStream(
      connection,
      () => wake(),
      () => {
        socket = undefined;
        socketsRetryAt = Date.now() + BACKOFF_INITIAL;
        wake();
      },
    );
    socket = { connectionId: connection.id, close };
  }

  async function run(force: boolean) {
    if (controlsBusy) return;
    const connection = await readConnection();
    if (!connection || controlsBusy) return;
    await ensurePoll();
    const status = readHubStatus((await browser.storage.local.get(HUB_STATUS_KEY))[HUB_STATUS_KEY]);
    if (!force && (status.retryAt ?? 0) > Date.now()) return;
    try {
      await assertHostPermission(connection.origin);
      if ((await readConnection())?.id !== connection.id || controlsBusy) return;
      const result = await sync(connection);
      if ((await readConnection())?.id !== connection.id || controlsBusy) return;
      delay = BACKOFF_INITIAL;
      await browser.alarms.clear(RETRY_ALARM);
      await setStatus({
        state: result.oversized ? 'error' : 'connected',
        origin: connection.origin,
        issue: result.oversized ? 'size' : undefined,
        lastSync: Date.now(),
      });
      ensureStream(connection);
      more ||= result.more;
    } catch (error) {
      if ((await readConnection())?.id !== connection.id || controlsBusy) return;
      stopStream();
      await reportFailure(connection, status, issueOf(error));
    }
  }

  function wake(force = false) {
    if (controlsBusy) return;
    if (running) {
      more = true;
      return;
    }
    running = run(force)
      .catch(() => console.warn('[DashFlow] Не удалось обновить состояние Hub'))
      .finally(() => {
        running = undefined;
        if (more) {
          more = false;
          wake();
        }
      });
  }

  function isWorkspace(sender: chrome.runtime.MessageSender): boolean {
    if (sender.id !== browser.runtime.id || typeof sender.url !== 'string') return false;
    const url = new URL(sender.url);
    return `${url.protocol}//${url.host}${url.pathname}` === pageUrl;
  }

  async function earlierItem(id: unknown): Promise<HubReply> {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
      return { ok: false, issue: 'data' };
    }
    const local = await hubSyncStore.earlierItem(id);
    if (local) return { ok: true, item: local };
    const connection = await readConnection();
    if (!connection) return { ok: true };
    try {
      await assertHostPermission(connection.origin);
      const item = await getHubEarlierItem(connection, id);
      return { ok: true, item };
    } catch (error) {
      return { ok: false, issue: issueOf(error) };
    }
  }

  async function manageAgent(message: Record<string, unknown>): Promise<HubReply> {
    const { type, id, since, until, previewToken } = message;
    const connection = await readConnection();
    if (!connection) return { ok: false, issue: 'unauthorized' };
    try {
      await assertHostPermission(connection.origin);
      if (type === HUB_AGENTS) return { ok: true, agents: await fetchHubAgents(connection) };
      if (!isAgentId(id)) return { ok: false, issue: 'data' };
      if (type === HUB_AGENT_REVOKE) {
        return { ok: true, agent: await revokeHubAgent(connection, id) };
      }
      if (!validDate(since) || (until !== undefined && !validDate(until))) {
        return { ok: false, issue: 'data' };
      }
      if (type === HUB_AGENT_PREVIEW) {
        return { ok: true, preview: await previewHubAgentRollback(connection, id, since, until) };
      }
      if (
        !until ||
        typeof previewToken !== 'string' ||
        !/^[A-Za-z0-9_-]{1,256}$/.test(previewToken)
      ) {
        return { ok: false, issue: 'data' };
      }
      const result = await rollbackHubAgent(connection, id, since, until, previewToken);
      wake(true);
      return { ok: true, result };
    } catch (error) {
      return { ok: false, issue: issueOf(error) };
    }
  }

  async function integrationRequest(type: string, id: unknown): Promise<HubReply> {
    const connection = await readConnection();
    if (!connection) return { ok: false, issue: 'unauthorized' };
    try {
      await assertHostPermission(connection.origin);
      if (type === HUB_INTEGRATIONS) {
        return { ok: true, integrations: await fetchHubIntegrations(connection) };
      }
      if (type === HUB_CALENDAR_AGENDA) {
        return { ok: true, snapshot: await fetchHubCalendar(connection) };
      }
      const integration = INTEGRATION_IDS.find((candidate) => candidate === id);
      if (!integration) return { ok: false, issue: 'data' };
      await pollHubIntegration(connection, integration);
      return { ok: true };
    } catch (error) {
      return { ok: false, issue: issueOf(error) };
    }
  }

  async function configure(type: string, origin: unknown, code: unknown): Promise<HubReply> {
    if (controlsBusy) return { ok: false, issue: 'data' };
    controlsBusy = true;
    try {
      const current = await readConnection();
      if (type === HUB_DISCONNECT) {
        stopStream();
        if (current) await hubSyncStore.disconnect(current.id);
        await browser.storage.local.remove(HUB_CONNECTION_KEY);
        await browser.alarms.clear(POLL_ALARM);
        await browser.alarms.clear(RETRY_ALARM);
        await setStatus(HUB_DISCONNECTED);
        return { ok: true };
      }
      if (current) return { ok: false, issue: 'data' };
      const address = normalizeHubOrigin(origin);
      if (!address) return { ok: false, issue: 'address' };
      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return { ok: false, issue: 'pairing' };
      await assertHostPermission(address);
      const token = await redeemHubCode(address, code);
      const id = crypto.randomUUID();
      await hubSyncStore.connect(id);
      await browser.storage.local.set({
        [HUB_CONNECTION_KEY]: { id, origin: address, token } satisfies HubConnection,
        [HUB_STATUS_KEY]: { state: 'connecting', origin: address } satisfies HubStatus,
      });
      socketsRetryAt = 0;
      return { ok: true };
    } catch (error) {
      return { ok: false, issue: issueOf(error) };
    } finally {
      controlsBusy = false;
      wake(true);
    }
  }

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== HUB_TAB || !port.sender || !isWorkspace(port.sender)) return;
    tabs.add(port);
    port.onDisconnect.addListener(() => {
      tabs.delete(port);
      if (tabs.size === 0) stopStream();
    });
    wake();
  });
  browser.alarms.onAlarm.addListener(({ name }) => {
    if (name === POLL_ALARM || name === RETRY_ALARM) wake();
  });
  browser.permissions.onAdded.addListener(() => wake(true));
  browser.permissions.onRemoved.addListener(() => wake(true));
  subscribeItemsChanged(() => wake());
  wake();

  return {
    wake,
    request(value: unknown, sender: chrome.runtime.MessageSender): Promise<HubReply> | undefined {
      const message = asRecord(value);
      const { type, origin, code, id } = message;
      if (
        type === HUB_INTEGRATIONS ||
        type === HUB_INTEGRATION_POLL ||
        type === HUB_CALENDAR_AGENDA
      ) {
        return isWorkspace(sender)
          ? integrationRequest(type, id)
          : Promise.resolve({ ok: false, issue: 'permissions' });
      }
      if (AGENT_REQUESTS.has(type)) {
        return isWorkspace(sender)
          ? manageAgent(message)
          : Promise.resolve({ ok: false, issue: 'permissions' });
      }
      if (
        type !== HUB_PAIR &&
        type !== HUB_DISCONNECT &&
        type !== HUB_RETRY &&
        type !== HUB_HISTORY
      )
        return;
      if (!isWorkspace(sender)) return Promise.resolve({ ok: false, issue: 'permissions' });
      if (type === HUB_HISTORY) return earlierItem(id);
      if (type === HUB_RETRY) {
        socketsRetryAt = 0;
        wake(true);
        return Promise.resolve({ ok: true });
      }
      return configure(type, origin, code);
    },
  };
}
