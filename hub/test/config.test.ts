import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadHubConfig } from '../src/config.js';

const temporaryDirectories: string[] = [];

async function makeDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dashflow-hub-config-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('loadHubConfig', () => {
  it('creates a loopback-only default config with restrictive Unix permissions', async () => {
    const homeDir = await makeDirectory();
    const configPath = path.join(homeDir, '.dashflow-hub', 'config.json');

    const config = await loadHubConfig({ homeDir, env: {} });

    expect(config).toEqual({
      host: '127.0.0.1',
      port: 47831,
      databasePath: path.join(homeDir, '.dashflow-hub', 'hub.sqlite'),
      extensionOrigins: [],
      writesPerMinute: 60,
    });
    expect(JSON.parse(await readFile(configPath, 'utf8'))).toEqual(config);
    if (process.platform !== 'win32') {
      expect((await stat(configPath)).mode & 0o777).toBe(0o600);
      expect((await stat(path.dirname(configPath))).mode & 0o777).toBe(0o700);
    }
  });

  it('applies environment overrides after the config file', async () => {
    const homeDir = await makeDirectory();
    const configPath = path.join(homeDir, 'settings.json');
    await writeFile(
      configPath,
      JSON.stringify({
        host: '127.0.0.1',
        port: 48000,
        extensionOrigins: ['chrome-extension://abcdefghijklmnopabcdefghijklmnop'],
      }),
    );

    const config = await loadHubConfig({
      configPath,
      homeDir,
      env: { DASHFLOW_HUB_PORT: '49000', DASHFLOW_HUB_DB_PATH: 'custom.sqlite' },
    });

    expect(config.port).toBe(49000);
    expect(config.databasePath).toBe(path.join(homeDir, 'custom.sqlite'));
    expect(config.extensionOrigins).toEqual([
      'chrome-extension://abcdefghijklmnopabcdefghijklmnop',
    ]);
  });

  it('rejects non-loopback host values that are not IP addresses and invalid ports', async () => {
    const homeDir = await makeDirectory();
    await expect(
      loadHubConfig({ homeDir, env: { DASHFLOW_HUB_HOST: 'localhost' } }),
    ).rejects.toThrow('DASHFLOW_HUB_HOST must be an IPv4 or IPv6 address');
    await expect(loadHubConfig({ homeDir, env: { DASHFLOW_HUB_PORT: '65536' } })).rejects.toThrow(
      'DASHFLOW_HUB_PORT must be an integer between 1 and 65535',
    );
  });

  it('rejects unknown fields and invalid extension origins', async () => {
    const homeDir = await makeDirectory();
    const configPath = path.join(homeDir, 'settings.json');
    await writeFile(configPath, JSON.stringify({ host: '127.0.0.1', accidental: true }));
    await expect(loadHubConfig({ configPath, env: {} })).rejects.toThrow(
      'Unknown config key: accidental',
    );

    await writeFile(configPath, JSON.stringify({ extensionOrigins: ['https://example.com'] }));
    await expect(loadHubConfig({ configPath, env: {} })).rejects.toThrow(
      'exact chrome-extension://',
    );
  });
});
