import { describe, expect, it } from 'vitest';
import { createIntegrationRuntime } from '../src/connectors/runtime.js';
import { parseConnectorSettings } from '../src/connectors/settings.js';
import { openHubRepository } from '../src/db/index.js';
import { createHubServer } from '../src/http/index.js';

describe('API состояния интеграций Hub', () => {
  it('показывает только безопасные метаданные устройству и не запускает выключенный коннектор', async () => {
    const repository = openHubRepository();
    const device = repository.createToken('Test device', ['sync']).token;
    const reader = repository.createToken('Test reader', ['items:read']).token;
    const integrations = createIntegrationRuntime({
      repository,
      databasePath: ':memory:',
      settings: { github: { login: 'synthetic', repositories: ['test/repo'] } },
      env: {},
    });
    const app = await createHubServer({ repository, integrations });
    try {
      expect((await app.inject('/v1/integrations')).statusCode).toBe(401);
      expect(
        (
          await app.inject({
            url: '/v1/integrations',
            headers: { authorization: `Bearer ${reader}` },
          })
        ).statusCode,
      ).toBe(403);
      const headers = { authorization: `Bearer ${device}` };
      expect((await app.inject({ url: '/v1/integrations', headers })).json()).toMatchObject({
        integrations: [
          { id: 'github', state: 'error', lastError: 'CONFIGURATION' },
          { id: 'telegram', state: 'disabled', lastError: null },
          { id: 'calendar', state: 'disabled', lastError: null },
          { id: 'mail', state: 'disabled', lastError: null },
        ],
      });
      expect((await app.inject({ url: '/v1/calendar/agenda', headers })).json()).toEqual({
        snapshot: null,
      });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/integrations/telegram/poll',
            headers,
            payload: {},
          })
        ).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
      await integrations.stop();
      repository.close();
    }
  });

  it('отклоняет секреты в настройках провайдеров и чат напоминаний вне списка доступа', () => {
    expect(() =>
      parseConnectorSettings({
        github: { login: 'test', repositories: ['test/repo'], token: 'synthetic' },
      }),
    ).toThrow();
    expect(() =>
      parseConnectorSettings({
        telegram: { allowedChatIds: ['123456789'], reminderChatId: '987654321' },
      }),
    ).toThrow();
  });
});
