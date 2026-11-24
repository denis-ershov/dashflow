import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { mcpMessages, type McpLocale } from './messages.js';
import { schemas } from './toolSchemas.js';
import {
  errorCode,
  workspace,
  WorkspaceError,
  type McpWorkspaceOptions,
  type Scope,
} from './workspace.js';

export interface DashflowMcpOptions extends McpWorkspaceOptions {
  locale?: McpLocale;
}

const INBOX_URI = 'dashflow://inbox';
const BOARD_URI = 'dashflow://board/{id}';
const TODAY_URI = 'dashflow://today';
const WORKSPACE_DATA = 'untrusted_workspace_data';

function serialize(data: unknown) {
  return JSON.stringify({ trust: WORKSPACE_DATA, data });
}

export function createDashflowMcp(options: DashflowMcpOptions) {
  const api = workspace(options);
  const messages = mcpMessages(options.locale ?? 'en');
  const instructions = messages.instructions;
  const server = new McpServer({ name: 'dashflow-hub', version: '0.1.0' }, { instructions });

  function description(name: Exclude<keyof typeof messages, 'instructions'>) {
    const [title = name, detail = ''] = messages[name];
    return { title, description: detail };
  }

  function result(execute: () => unknown) {
    try {
      return { content: [{ type: 'text' as const, text: serialize(execute()) }] };
    } catch (error) {
      return {
        isError: true,
        content: [
          { type: 'text' as const, text: JSON.stringify({ error: { code: errorCode(error) } }) },
        ],
      };
    }
  }

  function read(scope: Scope, execute: () => unknown) {
    return result(() => {
      api.authorize(scope);
      return execute();
    });
  }

  function resource(uri: URL, run: () => unknown) {
    try {
      const text = serialize(run());
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text }] };
    } catch (error) {
      const code = errorCode(error);
      throw new McpError(
        code === 'INTERNAL_ERROR' ? ErrorCode.InternalError : ErrorCode.InvalidRequest,
        code,
      );
    }
  }

  const readOnly = { readOnlyHint: true, openWorldHint: false };
  const creates = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  const modifies = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
  server.registerTool(
    'list_items',
    {
      ...description('list_items'),
      inputSchema: schemas.listItems,
      annotations: readOnly,
    },
    (input) => read('items:read', () => api.list(input)),
  );
  server.registerTool(
    'search_items',
    {
      ...description('search_items'),
      inputSchema: schemas.searchItems,
      annotations: readOnly,
    },
    (input) => read('items:read', () => api.list(input)),
  );
  server.registerTool(
    'get_item',
    {
      ...description('get_item'),
      inputSchema: schemas.itemId,
      annotations: readOnly,
    },
    ({ id }) => read('items:read', () => api.get(id)),
  );

  server.registerTool(
    'create_item',
    {
      ...description('create_item'),
      inputSchema: schemas.createItem,
      annotations: creates,
    },
    ({ idempotencyKey, ...draft }) =>
      result(() =>
        api.write('items:write', 'create_item', () => api.create(draft, idempotencyKey)),
      ),
  );
  server.registerTool(
    'update_item',
    {
      ...description('update_item'),
      inputSchema: schemas.updateItem,
      annotations: modifies,
    },
    ({ id, patch, expectedVersion }) =>
      result(() =>
        api.write('items:write', 'update_item', () => api.update(id, patch, expectedVersion)),
      ),
  );
  server.registerTool(
    'complete_task',
    {
      ...description('complete_task'),
      inputSchema: schemas.completeTask,
      annotations: modifies,
    },
    ({ id, expectedVersion }) =>
      result(() =>
        api.write('items:write', 'complete_task', () => api.completeTask(id, expectedVersion)),
      ),
  );
  server.registerTool(
    'move_card',
    {
      ...description('move_card'),
      inputSchema: schemas.moveCard,
      annotations: modifies,
    },
    ({ id, boardId, columnId, expectedVersion }) =>
      result(() =>
        api.write('items:write', 'move_card', () =>
          api.moveCard(id, boardId, columnId, expectedVersion),
        ),
      ),
  );
  server.registerTool(
    'create_reminder',
    {
      ...description('create_reminder'),
      inputSchema: schemas.reminder,
      annotations: creates,
    },
    ({ idempotencyKey, ...draft }) =>
      result(() =>
        api.write('items:write', 'create_reminder', () =>
          api.create({ ...draft, kind: 'reminder', status: 'todo' }, idempotencyKey),
        ),
      ),
  );
  server.registerTool(
    'publish_digest',
    {
      ...description('publish_digest'),
      inputSchema: schemas.digest,
      annotations: creates,
    },
    ({ idempotencyKey, ...draft }) =>
      result(() =>
        api.write('digests:write', 'publish_digest', () =>
          api.create({ ...draft, kind: 'digest', status: 'unread' }, idempotencyKey),
        ),
      ),
  );
  server.registerTool(
    'list_boards',
    {
      ...description('list_boards'),
      inputSchema: schemas.listBoards,
      annotations: readOnly,
    },
    ({ limit }) => read('boards:read', () => api.boards(limit)),
  );
  server.registerTool(
    'get_agenda',
    {
      ...description('get_agenda'),
      inputSchema: schemas.agenda,
      annotations: readOnly,
    },
    (input) => read('items:read', () => api.agenda(input)),
  );

  server.registerResource(
    'inbox',
    INBOX_URI,
    {
      ...description('inbox'),
      mimeType: 'application/json',
    },
    (uri) =>
      resource(uri, () => {
        api.authorize('items:read');
        return api.list({ status: 'inbox' });
      }),
  );
  server.registerResource(
    'today',
    TODAY_URI,
    {
      ...description('today'),
      mimeType: 'application/json',
    },
    (uri) =>
      resource(uri, () => {
        api.authorize('items:read');
        return api.agenda({});
      }),
  );
  server.registerResource(
    'board',
    new ResourceTemplate(BOARD_URI, { list: undefined }),
    {
      ...description('board'),
      mimeType: 'application/json',
    },
    (uri, { id }) =>
      resource(uri, () => {
        api.authorize('boards:read');
        api.authorize('items:read');
        if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
          throw new WorkspaceError('VALIDATION_FAILED');
        }
        return api.board(id);
      }),
  );
  return server;
}
