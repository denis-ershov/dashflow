#!/usr/bin/env node
import { chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadHubConfig } from './config.js';
import { openHubRepository } from './db/index.js';
import { createHubServer } from './http/index.js';
import { windowLimiter } from './http/access.js';
import { startMcpStdio } from './mcp/index.js';
import { webhookCommand } from './webhookCli.js';

const SCOPES = new Set([
  'items:read',
  'items:write',
  'items:manage',
  'boards:read',
  'boards:write',
  'digests:write',
  'sync',
]);

function printHelp(): void {
  process.stdout.write(
    `DashFlow Hub\n\nUsage:\n  dashflow-hub [serve]\n  dashflow-hub pair --origin <extension-origin>\n  dashflow-hub token create <name> --scope <scope[,scope...]> [--expires <ISO-date>]\n  dashflow-hub token list\n  dashflow-hub token revoke <token-id>\n  dashflow-hub webhook create <name>\n  dashflow-hub webhook list\n  dashflow-hub webhook revoke <webhook-id>\n\nEnvironment: DASHFLOW_HUB_CONFIG, DASHFLOW_HUB_HOST, DASHFLOW_HUB_PORT,\nDASHFLOW_HUB_DB_PATH, DASHFLOW_HUB_EXTENSION_ORIGINS, DASHFLOW_HUB_WRITES_PER_MINUTE.\n`,
  );
}

async function webhook(args: string[]): Promise<void> {
  const config = await loadHubConfig();
  const repository = await openConfiguredRepository(config.databasePath);
  const host = config.host.includes(':') ? `[${config.host}]` : config.host;
  try {
    webhookCommand(args, repository, `http://${host}:${config.port}/v1/webhooks/in`);
  } finally {
    repository.close();
  }
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  args.splice(index, 2);
  return value;
}

async function serve(): Promise<void> {
  const config = await loadHubConfig();
  const repository = await openConfiguredRepository(config.databasePath);
  let server: Awaited<ReturnType<typeof createHubServer>> | undefined;
  let resolveShutdown: (() => void) | undefined;
  const shutdown = new Promise<void>((resolve) => {
    resolveShutdown = resolve;
  });
  const onSignal = () => resolveShutdown?.();
  try {
    server = await createHubServer({
      repository,
      extensionOrigins: config.extensionOrigins,
      writesPerMinute: config.writesPerMinute,
      mcpAllowedHosts: config.mcpAllowedHosts,
    });
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
    const address = await server.listen({ host: config.host, port: config.port });
    process.stdout.write(`DashFlow Hub listening at ${address}\n`);
    await shutdown;
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    try {
      if (server) await server.close();
    } finally {
      repository.close();
    }
  }
}

async function mcpCommand(args: string[]) {
  if (args.length) throw new Error('Usage: dashflow-hub mcp');
  const token = process.env.DASHFLOW_HUB_TOKEN;
  if (!token) throw new Error('DASHFLOW_HUB_TOKEN is required');
  const config = await loadHubConfig();
  const repository = await openConfiguredRepository(config.databasePath);
  const limiter = windowLimiter();
  let stop: (() => void) | undefined;
  const closed = new Promise<void>((resolve) => {
    stop = resolve;
  });
  const notifyStop = () => stop?.();
  process.stdin.once('end', notifyStop);
  process.once('SIGINT', notifyStop);
  process.once('SIGTERM', notifyStop);
  let server: Awaited<ReturnType<typeof startMcpStdio>> | undefined;
  try {
    server = await startMcpStdio({
      repository,
      token,
      locale: process.env.DASHFLOW_HUB_MCP_LOCALE === 'ru' ? 'ru' : 'en',
      allowWrite: (tokenId) => limiter(tokenId, config.writesPerMinute),
    });
    if (!process.stdin.readableEnded) await closed;
  } finally {
    process.stdin.removeListener('end', notifyStop);
    process.removeListener('SIGINT', notifyStop);
    process.removeListener('SIGTERM', notifyStop);
    try {
      await server?.close();
    } finally {
      repository.close();
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

async function openConfiguredRepository(databasePath: string) {
  await mkdir(path.dirname(databasePath), { recursive: true, mode: 0o700 });
  const repository = openHubRepository(databasePath);
  try {
    if (process.platform !== 'win32') await chmod(databasePath, 0o600);
  } catch (error) {
    repository.close();
    throw error;
  }
  return repository;
}

async function pair(args: string[]): Promise<void> {
  const origin = option(args, '--origin');
  if (args.length > 0) throw new Error(`Unexpected pair argument: ${args[0]}`);
  if (!origin) throw new Error('pair requires --origin with an allowlisted extension origin');
  const config = await loadHubConfig();
  if (!config.extensionOrigins.includes(origin)) {
    throw new Error('Pairing origin is not in extensionOrigins in the Hub config');
  }
  const repository = await openConfiguredRepository(config.databasePath);
  try {
    const challenge = repository.createPairingChallenge(origin);
    process.stdout.write(`Pairing code: ${challenge.code}\nExpires at: ${challenge.expiresAt}\n`);
  } finally {
    repository.close();
  }
}

async function tokenCommand(args: string[]): Promise<void> {
  const action = args.shift();
  const config = await loadHubConfig();
  const repository = await openConfiguredRepository(config.databasePath);
  try {
    if (action === 'list' && args.length === 0) {
      const tokens = repository.listTokens();
      if (tokens.length === 0) {
        process.stdout.write('No tokens.\n');
        return;
      }
      for (const token of tokens) {
        const state = token.revokedAt ? `revoked ${token.revokedAt}` : 'active';
        process.stdout.write(
          `${token.id}\t${token.name}\t${state}\t${token.scopes.join(',')}\t${token.expiresAt ?? 'no expiry'}\n`,
        );
      }
      return;
    }

    if (action === 'revoke' && args.length === 1) {
      const [id] = args;
      if (!id || !repository.revokeToken(id)) throw new Error('Active token not found');
      process.stdout.write(`Revoked token ${id}.\n`);
      return;
    }

    if (action === 'create') {
      const name = args.shift();
      if (!name || name.startsWith('--')) throw new Error('token create requires a name');
      const scopesValue = option(args, '--scope');
      const expiresAt = option(args, '--expires');
      if (args.length > 0) throw new Error(`Unexpected token argument: ${args[0]}`);
      if (!scopesValue) throw new Error('token create requires --scope');
      const scopes = [...new Set(scopesValue.split(',').map((scope) => scope.trim()))];
      if (scopes.some((scope) => !SCOPES.has(scope))) {
        throw new Error(`Unsupported scope. Choose from: ${[...SCOPES].join(', ')}`);
      }
      const result = repository.createToken(name, scopes, expiresAt);
      process.stdout.write(`Token (shown once): ${result.token}\n`);
      process.stdout.write(`ID: ${result.record.id}\nScopes: ${result.record.scopes.join(', ')}\n`);
      return;
    }

    throw new Error('Usage: dashflow-hub token create|list|revoke');
  } finally {
    repository.close();
  }
}

export async function runCli(args = process.argv.slice(2)): Promise<void> {
  const [command, ...rest] = args;
  if (!command) {
    await serve();
    return;
  }
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === 'serve') {
    if (rest.length > 0) throw new Error(`Unexpected serve argument: ${rest[0]}`);
    await serve();
    return;
  }
  if (command === 'pair') {
    await pair(rest);
    return;
  }
  if (command === 'token') {
    await tokenCommand(rest);
    return;
  }
  if (command === 'webhook') {
    await webhook(rest);
    return;
  }
  if (command === 'mcp') {
    await mcpCommand(rest);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli().catch((error: unknown) => {
    process.stderr.write(`dashflow-hub: ${errorMessage(error)}\n`);
    process.exitCode = 1;
  });
}
