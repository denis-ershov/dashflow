import { chmod, lstat, mkdir, open, readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { homedir } from 'node:os';
import path from 'node:path';
import { parseConnectorSettings, type ConnectorSettings } from './connectors/settings.js';
import { parseWebhookTemplates, type WebhookTemplate } from './connectors/webhookTemplate.js';

export interface HubConfig {
  host: string;
  port: number;
  databasePath: string;
  extensionOrigins: string[];
  writesPerMinute: number;
  mcpAllowedHosts?: string[];
  integrations?: ConnectorSettings;
  webhookTemplates?: ReadonlyMap<string, WebhookTemplate>;
}

export interface LoadConfigOptions {
  configPath?: string;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

const DEFAULT_PORT = 47831;
const DEFAULT_WRITES_PER_MINUTE = 60;
const CONFIG_DIRECTORY = '.dashflow-hub';
const CONFIG_FILE = 'config.json';

function defaultConfigPath(homeDirectory: string): string {
  return path.join(homeDirectory, CONFIG_DIRECTORY, CONFIG_FILE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseHost(value: unknown, source: string): string {
  if (typeof value !== 'string' || isIP(value) === 0) {
    throw new Error(`${source} must be an IPv4 or IPv6 address`);
  }
  return value;
}

function parseInteger(value: unknown, name: string, min: number, max: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function parsePath(value: unknown, name: string, baseDirectory: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be a non-empty path`);
  }
  return path.resolve(baseDirectory, value);
}

function parseOrigins(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.some((origin) => typeof origin !== 'string')) {
    throw new Error(`${name} must be an array of extension origins`);
  }
  const origins = value as string[];
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`${name} contains an invalid extension origin`);
    }
    if (
      (parsed.protocol !== 'chrome-extension:' && parsed.protocol !== 'moz-extension:') ||
      !parsed.hostname ||
      (parsed.pathname !== '' && parsed.pathname !== '/') ||
      parsed.search !== '' ||
      parsed.hash !== '' ||
      parsed.username !== '' ||
      parsed.password !== '' ||
      parsed.port !== '' ||
      origin.replace(/\/$/u, '') !== `${parsed.protocol}//${parsed.hostname}`
    ) {
      throw new Error(
        `${name} entries must be exact chrome-extension:// or moz-extension:// origins`,
      );
    }
    const validId =
      (parsed.protocol === 'chrome-extension:' && /^[a-p]{32}$/u.test(parsed.hostname)) ||
      (parsed.protocol === 'moz-extension:' &&
        /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/u.test(parsed.hostname));
    if (!validId) throw new Error(`${name} contains an invalid extension origin`);
  }
  return [...new Set(origins.map((origin) => origin.replace(/\/$/u, '')))];
}

function parseMcpHosts(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length > 64)
    throw new Error(`${name} must be an array of hosts`);
  return [
    ...new Set(
      value.map((host: unknown) => {
        if (typeof host !== 'string' || !host || host.length > 255) {
          throw new Error(`${name} contains an invalid host`);
        }
        return host;
      }),
    ),
  ];
}

function parseConfigFile(value: unknown, baseDirectory: string): Partial<HubConfig> {
  if (!isRecord(value)) throw new Error('Config file must contain a JSON object');
  const knownKeys = new Set([
    'host',
    'port',
    'databasePath',
    'extensionOrigins',
    'writesPerMinute',
    'mcpAllowedHosts',
    'integrations',
    'webhookTemplates',
  ]);
  for (const key of Object.keys(value)) {
    if (!knownKeys.has(key)) throw new Error(`Unknown config key: ${key}`);
  }
  const config: Partial<HubConfig> = {};
  if (value.host !== undefined) config.host = parseHost(value.host, 'host');
  if (value.port !== undefined) config.port = parseInteger(value.port, 'port', 1, 65535);
  if (value.databasePath !== undefined) {
    config.databasePath = parsePath(value.databasePath, 'databasePath', baseDirectory);
  }
  if (value.extensionOrigins !== undefined) {
    config.extensionOrigins = parseOrigins(value.extensionOrigins, 'extensionOrigins');
  }
  if (value.writesPerMinute !== undefined) {
    config.writesPerMinute = parseInteger(value.writesPerMinute, 'writesPerMinute', 1, 10000);
  }
  if (value.mcpAllowedHosts !== undefined) {
    config.mcpAllowedHosts = parseMcpHosts(value.mcpAllowedHosts, 'mcpAllowedHosts');
  }
  if (value.integrations !== undefined) {
    config.integrations = parseConnectorSettings(value.integrations);
  }
  if (value.webhookTemplates !== undefined) {
    config.webhookTemplates = parseWebhookTemplates(value.webhookTemplates);
  }
  return config;
}

function parseEnvironment(env: NodeJS.ProcessEnv, baseDirectory: string): Partial<HubConfig> {
  const config: Partial<HubConfig> = {};
  if (env.DASHFLOW_HUB_HOST !== undefined) {
    config.host = parseHost(env.DASHFLOW_HUB_HOST, 'DASHFLOW_HUB_HOST');
  }
  if (env.DASHFLOW_HUB_PORT !== undefined) {
    config.port = parseInteger(env.DASHFLOW_HUB_PORT, 'DASHFLOW_HUB_PORT', 1, 65535);
  }
  if (env.DASHFLOW_HUB_DB_PATH !== undefined) {
    config.databasePath = parsePath(
      env.DASHFLOW_HUB_DB_PATH,
      'DASHFLOW_HUB_DB_PATH',
      baseDirectory,
    );
  }
  if (env.DASHFLOW_HUB_EXTENSION_ORIGINS !== undefined) {
    const origins = env.DASHFLOW_HUB_EXTENSION_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    config.extensionOrigins = parseOrigins(origins, 'DASHFLOW_HUB_EXTENSION_ORIGINS');
  }
  if (env.DASHFLOW_HUB_WRITES_PER_MINUTE !== undefined) {
    config.writesPerMinute = parseInteger(
      env.DASHFLOW_HUB_WRITES_PER_MINUTE,
      'DASHFLOW_HUB_WRITES_PER_MINUTE',
      1,
      10000,
    );
  }
  if (env.DASHFLOW_HUB_MCP_HOSTS !== undefined) {
    const hosts = env.DASHFLOW_HUB_MCP_HOSTS.split(',')
      .map((host) => host.trim())
      .filter(Boolean);
    config.mcpAllowedHosts = parseMcpHosts(hosts, 'DASHFLOW_HUB_MCP_HOSTS');
  }
  return config;
}

async function readConfigFile(configPath: string, platform: NodeJS.Platform): Promise<unknown> {
  try {
    const info = await lstat(configPath);
    if (!info.isFile() || info.isSymbolicLink()) {
      throw new Error(`Config path must be a regular file: ${configPath}`);
    }
    const contents = await readFile(configPath, 'utf8');
    if (platform !== 'win32') await chmod(configPath, 0o600);
    return JSON.parse(contents) as unknown;
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return null;
    if (error instanceof SyntaxError)
      throw new Error(`Invalid JSON in ${configPath}`, { cause: error });
    throw error;
  }
}

async function createDefaultConfig(
  configPath: string,
  config: HubConfig,
  platform: NodeJS.Platform,
): Promise<void> {
  const directory = path.dirname(configPath);
  await mkdir(directory, { recursive: true, mode: platform === 'win32' ? undefined : 0o700 });
  if (platform !== 'win32') await chmod(directory, 0o700);
  const handle = await open(configPath, 'wx', platform === 'win32' ? undefined : 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(config, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** Загружает JSON-конфигурацию, затем перекрывает её переменными DASHFLOW_HUB_*. */
export async function loadHubConfig(options: LoadConfigOptions = {}): Promise<HubConfig> {
  const homeDirectory = options.homeDir ?? homedir();
  const env = options.env ?? process.env;
  const configPath = path.resolve(
    options.configPath ?? env.DASHFLOW_HUB_CONFIG ?? defaultConfigPath(homeDirectory),
  );
  const platform = options.platform ?? process.platform;
  const configDirectory = path.dirname(configPath);
  const defaults: HubConfig = {
    host: '127.0.0.1',
    port: DEFAULT_PORT,
    databasePath: path.join(configDirectory, 'hub.sqlite'),
    extensionOrigins: [],
    writesPerMinute: DEFAULT_WRITES_PER_MINUTE,
  };

  let fileConfig = await readConfigFile(configPath, platform);
  if (fileConfig === null) {
    await createDefaultConfig(configPath, defaults, platform).catch(async (error: unknown) => {
      if (!isRecord(error) || error.code !== 'EEXIST') throw error;
      fileConfig = await readConfigFile(configPath, platform);
    });
  }

  const parsedFile = fileConfig === null ? {} : parseConfigFile(fileConfig, configDirectory);
  return {
    ...defaults,
    ...parsedFile,
    ...parseEnvironment(env, configDirectory),
  };
}
