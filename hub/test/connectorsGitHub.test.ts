import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConnectorError,
  createConnectorRunner,
  createGitHubConnector,
} from '../src/connectors/index.js';
import { openHubRepository, type HubRepository } from '../src/db/index.js';

const config = {
  token: 'test_fixture_only',
  login: 'octocat',
  repositories: ['Example/Project'],
};

function hit(id: number, path = 'issues', title = 'GitHub task') {
  return {
    id,
    title,
    number: id,
    state: 'open',
    html_url: `https://github.com/Example/Project/${path}/${id}`,
  };
}

function results(
  items: ReturnType<typeof hit>[] = [],
  total_count = items.length,
  incomplete_results = false,
) {
  return Response.json({ items, total_count, incomplete_results });
}

function requestUrl(input: Parameters<typeof fetch>[0]) {
  return new URL(input instanceof Request ? input.url : input);
}

const poll = () => ({ signal: new AbortController().signal });

describe('GitHub Search connector', () => {
  it('ищет назначения, ревью и упоминания только в заданном репозитории и объединяет совпадения', async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = (input, options) => {
      const url = requestUrl(input);
      expect(url.origin + url.pathname).toBe('https://api.github.com/search/issues');
      expect(options?.method).toBe('GET');
      expect(options?.redirect).toBe('error');
      expect(Boolean(new Headers(options?.headers).get('authorization'))).toBe(true);
      expect(url.href.includes(config.token)).toBe(false);
      const q = url.searchParams.get('q') ?? '';
      calls.push(q);
      return Promise.resolve(
        q.includes('is:issue') ? results([hit(1)]) : results([hit(2, 'pull')]),
      );
    };
    const connector = createGitHubConnector(config, fetcher);
    expect(JSON.stringify(connector.configSchema).includes('token')).toBe(false);
    expect(await connector.poll(poll())).toMatchObject({
      incomplete: false,
      items: [
        {
          externalId: '1',
          draft: { status: 'inbox', url: 'https://github.com/example/project/issues/1' },
        },
        {
          externalId: '2',
          draft: { status: 'inbox', url: 'https://github.com/example/project/pull/2' },
        },
      ],
    });
    expect(calls).toEqual([
      'repo:example/project is:open is:issue assignee:octocat',
      'repo:example/project is:open is:pr assignee:octocat',
      'repo:example/project is:open is:pr review-requested:octocat',
      'repo:example/project is:open is:issue mentions:octocat',
      'repo:example/project is:open is:pr mentions:octocat',
    ]);
  });

  it('ограничивает пагинацию и отмечает неполный поиск', async () => {
    const fetcher = vi.fn<typeof fetch>((input) => {
      const url = requestUrl(input);
      const page = url.searchParams.get('page');
      if (url.searchParams.get('q')?.includes('is:issue assignee:')) {
        return Promise.resolve(results([hit(page === '1' ? 1 : 2)], 1001));
      }
      return Promise.resolve(results());
    });
    const result = await createGitHubConnector(config, fetcher).poll(poll());
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(result.incomplete).toBe(true);
    expect(result.items.map((item) => item.externalId)).toEqual(['1', '2']);
  });

  it.each([
    () => Response.json({ total_count: 1, items: [] }),
    () => results([{ ...hit(1), html_url: 'https://other.invalid/Example/Project/issues/1' }]),
    () => results([{ ...hit(1), state: 'closed' }]),
    () =>
      new Response('x'.repeat(2 * 1024 * 1024 + 1), {
        headers: { 'content-type': 'application/json' },
      }),
    () =>
      new Response(null, { status: 302, headers: { location: 'https://other.invalid/redirect' } }),
  ])(
    'отклоняет подмену ответа, переполнение или редирект без продолжения запросов',
    async (response) => {
      const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(response()));
      await expect(createGitHubConnector(config, fetcher).poll(poll())).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it('повторяет временный сбой один раз и ждёт срока, заданного GitHub при 429', async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 503 })));
    fetcher.mockRejectedValueOnce(new Error('synthetic failure'));
    await expect(createGitHubConnector(config, fetcher).poll(poll())).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    fetcher.mockReset().mockImplementation(() =>
      Promise.resolve(
        new Response(null, {
          status: 429,
          headers: { 'retry-after': '120', 'x-ratelimit-reset': 'invalid' },
        }),
      ),
    );
    const start = Date.now();
    const settled = await createGitHubConnector(config, fetcher)
      .poll(poll())
      .catch((error: unknown) => error);
    expect(settled).toMatchObject({ code: 'RATE_LIMITED' });
    expect(settled instanceof ConnectorError && (settled.retryAt ?? 0) >= start + 120_000).toBe(
      true,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('Расписание и хранилище коннектора', () => {
  let directory: string;
  let repository: HubRepository;
  let statePath: string;
  const active: ReturnType<typeof createConnectorRunner>[] = [];

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'dashflow-github-test-'));
    repository = openHubRepository(join(directory, 'hub.sqlite'));
    statePath = join(directory, 'github.json');
  });

  afterEach(async () => {
    await Promise.all(active.splice(0).map((runner) => runner.stop()));
    repository.close();
    if (dirname(resolve(directory)) !== resolve(tmpdir()))
      throw new Error('Некорректный путь фикстуры');
    await rm(directory, { recursive: true, force: true });
  });

  function runner(
    fetcher: typeof fetch,
    destination?: { boardId: string; columnId: string },
    onChanges?: () => void,
  ) {
    const connector = createGitHubConnector({ ...config, ...destination }, fetcher);
    const instance = createConnectorRunner({ connector, repository, statePath, onChanges });
    active.push(instance);
    return instance;
  }

  it('пишет один раз на выбранную доску и сохраняет локальную карточку после повтора и перезапуска', async () => {
    let title = 'Первый заголовок';
    const fetcher: typeof fetch = (input) =>
      Promise.resolve(
        requestUrl(input).searchParams.get('q')?.includes('is:issue')
          ? results([hit(1, 'issues', title)])
          : results(),
      );
    const actor = { id: 'owner', name: 'Owner', type: 'user', scopes: ['sync'] } as const;
    const board = repository.createBoard(actor, { title: 'Доска' });
    const onChanges = vi.fn();
    const destination = { boardId: board.id, columnId: 'todo' };
    const first = runner(fetcher, destination, onChanges);
    await first.start();
    const [left, right] = await Promise.all([first.pollNow(), first.pollNow()]);
    expect(left).toEqual(right);
    expect(left).toMatchObject({ state: 'ok', lastError: null });
    expect(typeof left.nextPollAt).toBe('string');
    expect(onChanges).toHaveBeenCalledTimes(1);
    const [item] = repository.listItems().items;
    expect(item).toMatchObject({
      boardId: board.id,
      status: 'todo',
      source: { type: 'connector', id: 'github' },
    });
    if (!item) throw new Error('Карточка не создана');
    repository.updateItem(actor, item.id, { status: 'done' }, item.version);
    title = 'Изменённый заголовок GitHub';
    await first.stop();
    const second = runner(fetcher, destination, onChanges);
    await second.start();
    expect(second.status().lastSuccessAt).toBe(left.lastSuccessAt);
    expect((await second.pollNow()).state).toBe('ok');
    expect(repository.listItems().items).toEqual([
      expect.objectContaining({ id: item.id, status: 'done', title: 'Первый заголовок' }),
    ]);
    expect(onChanges).toHaveBeenCalledTimes(1);
    expect((await readFile(statePath, 'utf8')).includes(config.token)).toBe(false);
  });

  it('сохраняет причину и запрет повтора GitHub после перезапуска', async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(null, {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0', 'retry-after': '600' },
        }),
      ),
    );
    const first = runner(fetcher);
    await first.start();
    const status = await first.pollNow();
    expect(status).toMatchObject({
      state: 'error',
      lastError: 'RATE_LIMITED',
    });
    expect(typeof status.retryAt).toBe('string');
    expect(status.nextPollAt).toBe(status.retryAt);
    await first.stop();
    const second = runner(fetcher);
    await second.start();
    expect(await second.pollNow()).toEqual(status);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('отменяет активный запрос при остановке и не планирует следующий', async () => {
    let markRequested: (() => void) | undefined;
    const requested = new Promise<void>((resolve) => {
      markRequested = resolve;
    });
    const fetcher = vi.fn<typeof fetch>((_input, options) => {
      const signal = options?.signal;
      if (!signal) return Promise.reject(new Error('В запрос не передан сигнал отмены'));
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Запрос отменён')), { once: true });
        markRequested?.();
      });
    });
    const instance = runner(fetcher);
    await instance.start();
    const inFlight = instance.pollNow();
    await requested;
    expect(instance.status().state).toBe('polling');
    await instance.stop();
    expect((await inFlight).nextPollAt).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(repository.listItems().items).toHaveLength(0);
  });
});
