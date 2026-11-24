import { INTEGRATION_IDS, type IntegrationId } from '@dashflow/shared';
import type { HubRepository } from '../db/index.js';
import { createCalendarRunner } from './calendar.js';
import { createGitHubConnector } from './github.js';
import { createMailConnector } from './mail.js';
import { createConnectorRunner, type ConnectorStatus } from './runner.js';
import type { ConnectorSettings } from './settings.js';
import { createTelegramRunner } from './telegram.js';

type Runner = {
  start(): Promise<unknown>;
  stop(): Promise<unknown>;
  status(): ConnectorStatus;
  pollNow(): Promise<unknown>;
};

export type IntegrationStatus = Omit<ConnectorStatus, 'state'> & {
  state: ConnectorStatus['state'] | 'disabled';
};

function unavailable(id: IntegrationId, configured: boolean): IntegrationStatus {
  return {
    id,
    state: configured ? 'error' : 'disabled',
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: configured ? 'CONFIGURATION' : null,
    retryAt: null,
    nextPollAt: null,
  };
}

interface RuntimeOptions {
  settings?: ConnectorSettings;
  repository: HubRepository;
  databasePath: string;
  env?: NodeJS.ProcessEnv;
}

export function createIntegrationRuntime({
  settings,
  repository,
  databasePath,
  env = process.env,
}: RuntimeOptions) {
  const listeners = new Set<() => void>();
  const runners = new Map<IntegrationId, Runner>();
  const failed = new Map<IntegrationId, IntegrationStatus>();
  const statePath = (id: IntegrationId) => `${databasePath}.${id}.json`;
  const onChanges = () => {
    for (const listener of listeners) listener();
  };
  const intervalMs = (value?: number) => (value === undefined ? undefined : value * 60_000);

  function register<Id extends IntegrationId, T extends Runner>(
    id: Id,
    create: (config: NonNullable<ConnectorSettings[Id]>) => T,
  ): T | undefined {
    const config = settings?.[id];
    if (!config) return;
    try {
      const runner = create(config);
      runners.set(id, runner);
      return runner;
    } catch {
      failed.set(id, unavailable(id, true));
    }
  }

  register('github', ({ intervalMinutes, ...github }) => {
    return createConnectorRunner({
      connector: createGitHubConnector({ ...github, token: env.DASHFLOW_HUB_GITHUB_TOKEN ?? '' }),
      repository,
      statePath: statePath('github'),
      intervalMs: intervalMs(intervalMinutes),
      onChanges,
    });
  });
  register('telegram', ({ intervalMinutes, ...telegram }) => {
    return createTelegramRunner({
      ...telegram,
      token: env.DASHFLOW_HUB_TELEGRAM_TOKEN ?? '',
      repository,
      statePath: statePath('telegram'),
      intervalMs: intervalMs(intervalMinutes),
      onChanges,
    });
  });
  const calendar = register('calendar', ({ intervalMinutes, ...details }) => {
    return createCalendarRunner({
      ...details,
      url: env.DASHFLOW_HUB_CALENDAR_ICS_URL ?? '',
      repository,
      statePath: statePath('calendar'),
      intervalMs: intervalMs(intervalMinutes),
    });
  });
  register('mail', ({ intervalMinutes, ...mail }) =>
    createConnectorRunner({
      connector: createMailConnector({
        ...mail,
        username: env.DASHFLOW_HUB_IMAP_USERNAME ?? '',
        password: env.DASHFLOW_HUB_IMAP_PASSWORD ?? '',
      }),
      repository,
      statePath: statePath('mail'),
      intervalMs: intervalMs(intervalMinutes ?? 60),
      onChanges,
    }),
  );

  return {
    async start() {
      await Promise.all(
        [...runners].map(async ([id, runner]) => {
          try {
            await runner.start();
          } catch {
            failed.set(id, { ...unavailable(id, true), lastError: 'STORAGE' });
          }
        }),
      );
    },
    async stop() {
      await Promise.allSettled([...runners.values()].map((runner) => runner.stop()));
      listeners.clear();
    },
    subscribe(callback: () => void) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    status() {
      return INTEGRATION_IDS.map(
        (id) => failed.get(id) ?? runners.get(id)?.status() ?? unavailable(id, false),
      );
    },
    poll(id: string) {
      const known = INTEGRATION_IDS.find((candidate) => candidate === id);
      if (!known) return false;
      const runner = runners.get(known);
      if (!runner || failed.has(known)) return false;
      void runner.pollNow().catch(() => {
        failed.set(known, { ...unavailable(known, true), lastError: 'STORAGE' });
      });
      return true;
    },
    agenda: () => calendar?.agenda() ?? null,
  };
}

export type IntegrationRuntime = ReturnType<typeof createIntegrationRuntime>;
