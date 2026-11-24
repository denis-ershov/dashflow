import { randomUUID } from 'node:crypto';
import { lstat, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { ConnectorError, connectorErrors } from './contract.js';

const timestamp = z.iso.datetime();
const statusSchema = z
  .object({
    state: z.enum(['idle', 'ok', 'error']),
    lastAttemptAt: timestamp.nullable(),
    lastSuccessAt: timestamp.nullable(),
    lastError: z.enum(connectorErrors).nullable(),
    retryAt: timestamp.nullable(),
  })
  .strict();

export type PersistedConnectorStatus = z.infer<typeof statusSchema>;

function missing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

export async function loadConnectorStatus(path: string) {
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.size > 4096) throw new ConnectorError('STORAGE');
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    return statusSchema.parse(value);
  } catch (error) {
    if (missing(error)) return;
    throw new ConnectorError('STORAGE');
  }
}

export async function saveConnectorStatus(path: string, status: PersistedConnectorStatus) {
  const pending = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(pending, `${JSON.stringify(status)}\n`, {
      flag: 'wx',
      mode: 0o600,
      flush: true,
    });
    await rename(pending, path);
  } catch {
    try {
      await unlink(pending);
    } catch (error) {
      if (!missing(error)) throw new ConnectorError('STORAGE');
    }
    throw new ConnectorError('STORAGE');
  }
}
