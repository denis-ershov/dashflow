import { ITEM_LIMITS } from '@dashflow/shared';
import { z } from 'zod';
import { ConnectorError, type ConnectorItem, type PollingConnector } from './contract.js';
import { githubSearch } from './githubHttp.js';

const login = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
  .max(39);
const repository = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9_.-]+$/i)
  .max(140);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const publicConfiguration = z
  .object({
    login,
    repositories: z.array(repository).min(1).max(3),
    boardId: id.optional(),
    columnId: id.optional(),
  })
  .strict();
const configuration = publicConfiguration.extend({
  token: z.string().regex(/^[A-Za-z0-9_]{1,512}$/),
});

const PAGE_SIZE = 50;
const PAGE_LIMIT = 2;
const searchResult = z.object({
  total_count: z.int().nonnegative(),
  incomplete_results: z.boolean(),
  items: z
    .array(
      z.object({
        id: z.int().positive(),
        number: z.int().positive(),
        title: z.string().trim().min(1).max(5_000),
        html_url: z.string().max(512),
        state: z.literal('open'),
      }),
    )
    .max(PAGE_SIZE),
});

interface GitHubConnectorConfig {
  token: string;
  login: string;
  repositories: readonly string[];
  boardId?: string;
  columnId?: string;
}

function selectors(username: string) {
  return [
    ['issue', `assignee:${username}`],
    ['pr', `assignee:${username}`],
    ['pr', `review-requested:${username}`],
    ['issue', `mentions:${username}`],
    ['pr', `mentions:${username}`],
  ] as const;
}

export function createGitHubConnector(
  options: GitHubConnectorConfig,
  fetcher: typeof fetch = fetch,
): PollingConnector {
  const config = configuration.safeParse(options);
  if (!config.success || Boolean(config.data.boardId) !== Boolean(config.data.columnId)) {
    throw new ConnectorError('CONFIGURATION');
  }
  const { token, login: username, repositories, boardId, columnId } = config.data;
  const search = githubSearch(token, fetcher);
  return {
    id: 'github',
    name: 'GitHub',
    configSchema: z.toJSONSchema(publicConfiguration),
    async poll({ signal }) {
      const items = new Map<string, ConnectorItem>();
      let incomplete = false;
      for (const repo of new Set(repositories.map((value) => value.toLowerCase()))) {
        for (const [type, qualifier] of selectors(username)) {
          for (let page = 1; page <= PAGE_LIMIT; page++) {
            const q = `repo:${repo} is:open is:${type} ${qualifier}`;
            const parameters = new URLSearchParams({
              q,
              sort: 'updated',
              order: 'desc',
              per_page: String(PAGE_SIZE),
              page: String(page),
            });
            const result = searchResult.safeParse(await search(parameters, signal));
            if (!result.success) throw new ConnectorError('INVALID_RESPONSE');
            for (const item of result.data.items) {
              const path = type === 'pr' ? 'pull' : 'issues';
              const url = `https://github.com/${repo}/${path}/${item.number}`;
              if (item.html_url.toLowerCase() !== url) throw new ConnectorError('INVALID_RESPONSE');
              const externalId = String(item.id);
              items.set(externalId, {
                externalId,
                draft: {
                  kind: 'task',
                  title: item.title.slice(0, ITEM_LIMITS.titleLength),
                  url,
                  boardId,
                  status: columnId ?? 'inbox',
                },
              });
            }
            const more = result.data.total_count > page * PAGE_SIZE;
            incomplete ||= result.data.incomplete_results || (more && page === PAGE_LIMIT);
            if (!more) break;
          }
        }
      }
      return { items: [...items.values()], incomplete };
    },
  };
}
