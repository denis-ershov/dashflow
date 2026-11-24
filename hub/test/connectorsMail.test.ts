import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMailConnector } from '../src/connectors/mail.js';
import type { MailClient, MailClientFactory } from '../src/connectors/mailImap.js';
import { createConnectorRunner } from '../src/connectors/runner.js';
import { openHubRepository, type HubRepository } from '../src/db/index.js';

const password = 'synthetic-password-fixture';
const config = {
  host: 'imap.example.test',
  username: 'owner@example.test',
  password,
  allowedSenders: ['reports@example.test'],
  subjectIncludes: 'Отчёт',
};
const now = Date.parse('2026-11-25T03:30:00Z');
const included = new Date('2026-11-24T00:00:00Z');

function message(
  uid: number,
  subject: string,
  internalDate = included,
  address = 'Reports@example.test',
) {
  return {
    uid,
    internalDate,
    envelope: {
      from: [{ name: 'Служба', address }],
      subject,
      to: [{ address: 'private-recipient@example.test' }],
      messageId: '<message-id@example.test>',
    },
    source: Buffer.from('fixture raw source'),
    bodyParts: new Map([['1', Buffer.from('fixture attachment')]]),
  };
}

async function* toStream(values: readonly unknown[]) {
  for (const value of values) yield Promise.resolve(value);
}

function client(messages: readonly unknown[] = [], found: unknown = [], uidValidity = 42n) {
  return {
    connect: vi.fn<MailClient['connect']>().mockResolvedValue(undefined),
    on: vi.fn<MailClient['on']>(),
    close: vi.fn<MailClient['close']>(),
    mailboxOpen: vi
      .fn<MailClient['mailboxOpen']>()
      .mockResolvedValue({ readOnly: true, uidValidity }),
    search: vi.fn<MailClient['search']>().mockResolvedValue(found),
    fetch: vi.fn<MailClient['fetch']>(() => toStream(messages)),
  } satisfies MailClient;
}

const polling = () => ({ signal: new AbortController().signal });

describe('Почтовый IMAP-дайджест', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => vi.restoreAllMocks());

  it('выбирает прочитанные и непрочитанные письма через EXAMINE и сохраняет только разрешённый envelope', async () => {
    const mail = client(
      [
        message(1, 'Отчёт вчера'),
        message(2, 'Отчёт постороннего', included, 'other@example.test'),
        message(3, 'Тема вне фильтра'),
        message(4, 'Отчёт на нижней границе', new Date(+included - 1)),
        message(5, 'Отчёт на верхней границе', new Date('2026-11-25T00:00:00Z')),
        message(6, 'ОТЧЁТ [ссылка](https://not-used.test)\n# Разметка'),
        message(6, 'Повтор того же UID'),
      ],
      { all: '1:6', count: 6 },
    );
    const factory = vi.fn<MailClientFactory>((options) => {
      expect(options).toMatchObject({
        host: config.host,
        port: 993,
        secure: true,
        servername: config.host,
        tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
        logger: false,
        logRaw: false,
        emitLogs: false,
        disableCompression: true,
        maxLineLength: 32 * 1024,
        maxLiteralSize: 16 * 1024,
        maxResponseSize: 64 * 1024,
      });
      expect(options.auth?.user === config.username && options.auth.pass === password).toBe(true);
      return mail;
    });
    const connector = createMailConnector(config, factory);
    const result = await connector.poll(polling());
    expect(result.incomplete).toBe(false);
    expect(result.items.map(({ draft }) => draft)).toEqual([
      {
        kind: 'digest',
        title: 'Email · 2026-11-24',
        body: '- Служба <Reports@example.test> — ОТЧЁТ \\[ссылка\\](https://not-used.test) # Разметка\n- Служба <Reports@example.test> — Отчёт вчера',
        status: 'unread',
      },
    ]);
    expect(mail.mailboxOpen).toHaveBeenCalledExactlyOnceWith('INBOX', { readOnly: true });
    expect(mail.search).toHaveBeenCalledExactlyOnceWith(
      { since: new Date('2026-11-23T00:00:00Z'), before: new Date('2026-11-26T00:00:00Z') },
      { uid: true, strict: true, returnOptions: ['ALL', 'COUNT'] },
    );
    expect(mail.fetch).toHaveBeenCalledExactlyOnceWith(
      [6, 5, 4, 3, 2, 1],
      { uid: true, internalDate: true, envelope: true },
      { uid: true },
    );
    expect(mail.close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(connector.configSchema).includes('password')).toBe(false);
  });

  it('читает сжатый диапазон UID без полного разворачивания и ограничивает FETCH сотней', async () => {
    const mail = client([], { count: 0xffff_ffff, all: '1:4294967295' });
    const result = await createMailConnector(config, () => mail).poll(polling());
    expect(result).toEqual({ items: [], incomplete: true });
    const ids = mail.fetch.mock.calls[0]?.[0] ?? [];
    expect(ids).toHaveLength(100);
    expect(ids[0]).toBe(0xffff_ffff);
    expect(ids.at(-1)).toBe(0xffff_ffff - 99);
  });

  it.each([
    { count: 1, all: '1:2' },
    { count: 2, all: '1,1' },
    { count: 1, all: '4294967296' },
    false,
  ])('отклоняет отказ поискового запроса и неверный набор UID', async (searchResult) => {
    const mail = client([], searchResult);
    await expect(createMailConnector(config, () => mail).poll(polling())).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    expect(mail.fetch).not.toHaveBeenCalled();
    expect(mail.close).toHaveBeenCalledTimes(1);
  });

  it('отклоняет открытие в режиме записи и останавливает чтение', async () => {
    const mail = client([], [1]);
    mail.mailboxOpen.mockResolvedValue({ readOnly: false, uidValidity: 42n });
    await expect(createMailConnector(config, () => mail).poll(polling())).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    expect(mail.search).not.toHaveBeenCalled();
    expect(mail.close).toHaveBeenCalledTimes(1);
  });

  it('проверяет обязательность allowlist и отсутствие произвольного порта в хосте', () => {
    expect(() => createMailConnector({ ...config, allowedSenders: [] })).toThrow('CONFIGURATION');
    expect(() => createMailConnector({ ...config, host: 'imap.example.test:143' })).toThrow(
      'CONFIGURATION',
    );
    expect(() => createMailConnector({ ...config, subjectIncludes: '\n' })).toThrow(
      'CONFIGURATION',
    );
  });

  it('возвращает безопасный код при отказе входа или oversized ответе', async () => {
    const mail = client();
    const detailed = Object.assign(new Error(password), { authenticationFailed: true });
    mail.connect.mockRejectedValueOnce(detailed);
    mail.connect.mockRejectedValueOnce(
      Object.assign(new Error(password), { code: 'LiteralTooLarge' }),
    );
    const connector = createMailConnector(config, () => mail);
    await expect(connector.poll(polling())).rejects.toMatchObject({
      message: 'UNAUTHORIZED',
      code: 'UNAUTHORIZED',
    });
    await expect(connector.poll(polling())).rejects.toMatchObject({
      message: 'INVALID_RESPONSE',
      code: 'INVALID_RESPONSE',
    });
    expect(mail.close).toHaveBeenCalledTimes(2);
  });

  it('закрывает IMAP-сессию, когда отменяется текущий опрос', async () => {
    const mail = client();
    const abort = new AbortController();
    mail.connect.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          mail.close.mockImplementation(() => reject(new Error(password)));
        }),
    );
    const collected = createMailConnector(config, () => mail).poll({ signal: abort.signal });
    abort.abort();
    await expect(collected).rejects.toMatchObject({ message: 'UNAVAILABLE' });
    expect(mail.close).toHaveBeenCalledTimes(1);
  });
});

describe('Локальное хранение почтового дайджеста', () => {
  let directory: string;
  let repository: HubRepository;
  const active: ReturnType<typeof createConnectorRunner>[] = [];

  beforeEach(async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    directory = await mkdtemp(join(tmpdir(), 'dashflow-mail-'));
    repository = openHubRepository(join(directory, 'hub.sqlite'));
  });

  afterEach(async () => {
    await Promise.all(active.splice(0).map((instance) => instance.stop()));
    vi.restoreAllMocks();
    repository.close();
    if (dirname(resolve(directory)) !== resolve(tmpdir()))
      throw new Error('Некорректный путь фикстуры');
    await rm(directory, { force: true, recursive: true });
  });

  async function run(subject: string, uidValidity: bigint, date: Date) {
    const mail = client([message(1, subject, date)], [1], uidValidity);
    const connector = createMailConnector(config, () => mail);
    const statePath = join(directory, 'mail.json');
    const instance = createConnectorRunner({ connector, repository, statePath });
    active.push(instance);
    await instance.start();
    expect((await instance.pollNow()).state).toBe('ok');
    expect((await readFile(statePath, 'utf8')).includes(password)).toBe(false);
    await instance.stop();
  }

  it('не создаёт второй дайджест при смене UIDVALIDITY и создаёт его для следующего дня', async () => {
    await run('Отчёт первый', 50n, included);
    await run('Отчёт другой UIDVALIDITY', 51n, included);
    expect(repository.listItems().items).toMatchObject([
      { title: 'Email · 2026-11-24', body: '- Служба <Reports@example.test> — Отчёт первый' },
    ]);
    vi.mocked(Date.now).mockReturnValue(now + 86_400_000);
    await run('Отчёт новый день', 51n, new Date('2026-11-25T00:00:00Z'));
    expect(repository.listItems().items.map(({ title }) => title)).toEqual([
      'Email · 2026-11-25',
      'Email · 2026-11-24',
    ]);
  });
});
