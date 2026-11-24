import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTelegramRunner } from '../src/connectors/telegram.js';
import { openHubRepository, type HubRepository } from '../src/db/index.js';

const fakeToken = '1000000:synthetic-fixture-only';
const allowed = '-10000001';
const foreign = '-10000002';
const actor = { id: 'user', name: 'User', type: 'user', scopes: ['sync'] } as const;

function rpc(result: unknown) {
  return Response.json({ ok: true, result });
}

function incoming(update_id: number, chat: string, text?: string) {
  return {
    update_id,
    message: { message_id: update_id, chat: { id: Number(chat) }, text },
  };
}

function call(input: Parameters<typeof fetch>[0], options?: RequestInit) {
  const url = new URL(input instanceof Request ? input.url : input);
  expect(url.origin).toBe('https://api.telegram.org');
  expect(url.search).toBe('');
  expect(options?.method).toBe('POST');
  expect(options?.redirect).toBe('error');
  expect(options?.signal).toBeInstanceOf(AbortSignal);
  const body: unknown = JSON.parse(typeof options?.body === 'string' ? options.body : '{}');
  return { send: url.pathname.endsWith('/sendMessage'), body };
}

describe('Telegram polling connector', () => {
  let directory: string;
  let repository: HubRepository;
  let statePath: string;
  const active: ReturnType<typeof createTelegramRunner>[] = [];

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'dashflow-telegram-'));
    repository = openHubRepository(join(directory, 'hub.sqlite'));
    statePath = join(directory, 'telegram.json');
  });

  afterEach(async () => {
    await Promise.all(active.splice(0).map((runner) => runner.stop()));
    vi.restoreAllMocks();
    repository.close();
    if (dirname(resolve(directory)) !== resolve(tmpdir()))
      throw new Error('Некорректный путь фикстуры');
    await rm(directory, { recursive: true, force: true });
  });

  function start(fetcher: typeof fetch, reminderChatId?: string, onChanges?: () => void) {
    const runner = createTelegramRunner(
      {
        token: fakeToken,
        allowedChatIds: [allowed],
        reminderChatId,
        repository,
        statePath,
        onChanges,
      },
      fetcher,
    );
    active.push(runner);
    return runner.start().then(() => runner);
  }

  function state<T>(run: (db: DatabaseSync) => T) {
    const db = new DatabaseSync(`${statePath}.sqlite`);
    try {
      return run(db);
    } finally {
      db.close();
    }
  }

  it('принимает текст разрешённого чата, продвигает offset для пропусков и переживает повтор', async () => {
    const polls: unknown[] = [];
    const onChanges = vi.fn();
    const batch = [
      incoming(8, foreign, 'Чужой текст'),
      incoming(9, allowed, '<b>Заметка</b>'),
      incoming(10, allowed),
      { update_id: 11 },
    ];
    const fetcher: typeof fetch = (input, options) => {
      const api = call(input, options);
      expect(api.send).toBe(false);
      polls.push(api.body);
      return Promise.resolve(rpc(batch));
    };
    const first = await start(fetcher, undefined, onChanges);
    expect((await first.pollNow()).state).toBe('ok');
    expect(state((db) => db.prepare('SELECT offset FROM telegram_state').get())).toEqual({
      offset: 12,
    });
    expect(
      repository
        .listItems()
        .items.map(({ title, body, kind, status }) => ({ title, body, kind, status })),
    ).toEqual([{ title: '<b>Заметка</b>', body: '<b>Заметка</b>', kind: 'note', status: 'inbox' }]);
    await first.stop();
    const second = await start(fetcher, undefined, onChanges);
    await second.pollNow();
    expect(polls).toEqual(
      [0, 12].map((offset) => ({
        offset,
        limit: 25,
        timeout: 10,
        allowed_updates: ['message'],
      })),
    );
    await second.stop();

    // Имитируем завершение процесса сразу после записи в основную БД.
    state((db) => db.prepare('UPDATE telegram_state SET offset = 0').run());
    const restarted = await start(fetcher, undefined, onChanges);
    await restarted.pollNow();
    expect(repository.listItems().items).toHaveLength(1);
    expect(onChanges).toHaveBeenCalledTimes(1);
  });

  it('сбрасывает устаревший offset перед повторным использованием идентификаторов Telegram', async () => {
    const clock = vi.spyOn(Date, 'now');
    const now = Date.now();
    const offsets: unknown[] = [];
    const fetcher: typeof fetch = (input, options) => {
      offsets.push(call(input, options).body);
      return Promise.resolve(rpc([incoming(offsets.length === 1 ? 500 : 7, allowed, 'Текст')]));
    };
    const first = await start(fetcher);
    await first.pollNow();
    await first.stop();
    clock.mockReturnValue(now + 7 * 86_400_000);
    const next = await start(fetcher);
    await next.pollNow();
    expect(offsets).toMatchObject([{ offset: 0 }, { offset: 0 }]);
    expect(repository.listItems().items).toHaveLength(2);
    expect(state((db) => db.prepare('SELECT offset FROM telegram_state').get())).toEqual({
      offset: 8,
    });
  });

  it('отправляет только заголовок в настроенный чат и сохраняет подтверждённую доставку', async () => {
    const remindAt = new Date(Date.now() - 1_000).toISOString();
    repository.createItem(actor, {
      kind: 'reminder',
      title: 'Встреча',
      body: 'Скрытые подробности',
      remindAt,
    });
    const outbound: unknown[] = [];
    const fetcher: typeof fetch = (input, options) => {
      const api = call(input, options);
      if (!api.send) return Promise.resolve(rpc([]));
      outbound.push(api.body);
      return Promise.resolve(rpc({ message_id: 1, chat: { id: Number(allowed) } }));
    };
    const first = await start(fetcher, allowed);
    await first.pollNow();
    await first.stop();
    const second = await start(fetcher, allowed);
    await second.pollNow();
    expect(outbound).toEqual([
      {
        chat_id: allowed,
        text: 'Встреча',
        link_preview_options: { is_disabled: true },
      },
    ]);
    expect(state((db) => db.prepare('SELECT state FROM telegram_deliveries').get())).toEqual({
      state: 'sent',
    });
  });

  it('не повторяет доставку после неопределённого сетевого сбоя и очищает ошибку от токена', async () => {
    repository.createItem(actor, {
      kind: 'reminder',
      title: 'Задача',
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });
    let sends = 0;
    const fetcher: typeof fetch = (input, options) => {
      if (!call(input, options).send) return Promise.resolve(rpc([]));
      sends++;
      const url = new URL(input instanceof Request ? input.url : input);
      return Promise.reject(new Error(url.href));
    };
    const first = await start(fetcher, allowed);
    const failed = await first.pollNow();
    expect(failed.lastError).toBe('UNAVAILABLE');
    expect(JSON.stringify(failed).includes(fakeToken)).toBe(false);
    await first.stop();
    const second = await start(fetcher, allowed);
    await second.pollNow();
    expect(sends).toBe(1);
    expect(state((db) => db.prepare('SELECT state FROM telegram_deliveries').get())).toEqual({
      state: 'failed',
    });
  });

  it('откладывает подтверждённый отказ 429 и пропускает ручную попытку до срока', async () => {
    repository.createItem(actor, {
      kind: 'reminder',
      title: 'Задача',
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });
    let sends = 0;
    const fetcher: typeof fetch = (input, options) => {
      if (!call(input, options).send) return Promise.resolve(rpc([]));
      sends++;
      return Promise.resolve(
        Response.json(
          {
            ok: false,
            error_code: 429,
            parameters: { retry_after: 90 },
          },
          { status: 429 },
        ),
      );
    };
    const runner = await start(fetcher, allowed);
    const status = await runner.pollNow();
    expect(status.lastError).toBe('RATE_LIMITED');
    expect(status.retryAt).toBe(status.nextPollAt);
    expect(await runner.pollNow()).toEqual(status);
    expect(sends).toBe(1);
    expect(state((db) => db.prepare('SELECT state FROM telegram_deliveries').all())).toHaveLength(
      0,
    );
  });

  it('отклоняет чат напоминаний вне списка и не отправляет сообщения при выключенной опции', async () => {
    expect(() =>
      createTelegramRunner({
        token: fakeToken,
        allowedChatIds: [allowed],
        reminderChatId: foreign,
        repository,
        statePath,
      }),
    ).toThrow('CONFIGURATION');
    repository.createItem(actor, {
      kind: 'reminder',
      title: 'Задача',
      remindAt: new Date(Date.now() - 1000).toISOString(),
    });
    const fetcher = vi.fn<typeof fetch>((input, options) => {
      expect(call(input, options).send).toBe(false);
      return Promise.resolve(rpc([]));
    });
    const runner = await start(fetcher);
    await runner.pollNow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    () => rpc([{ update_id: '5' }]),
    () => new Response(null, { status: 302, headers: { location: 'https://other.invalid/' } }),
    () => rpc('x'.repeat(512 * 1024 + 1)),
  ])(
    'не меняет offset и Inbox при невалидном, перенаправленном или слишком большом ответе',
    async (response) => {
      const runner = await start(() => Promise.resolve(response()));
      expect((await runner.pollNow()).lastError).toBe('INVALID_RESPONSE');
      expect(repository.listItems().items).toHaveLength(0);
      expect(state((db) => db.prepare('SELECT offset FROM telegram_state').get())).toEqual({
        offset: 0,
      });
    },
  );
});
