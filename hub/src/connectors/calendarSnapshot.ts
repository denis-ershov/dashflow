import { randomUUID } from 'node:crypto';
import { lstat, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { ConnectorError } from './contract.js';

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const timestamp = z.int().min(-8_640_000_000_000_000).max(8_640_000_000_000_000);
const snapshot = z
  .object({
    updatedAt: z.iso.datetime(),
    window: z
      .object({ start: timestamp, end: timestamp, zone: z.string().min(1).max(100) })
      .strict(),
    events: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^\d+:-?\d+$/)
              .max(40),
            title: z.string().max(300),
            start: timestamp,
            end: timestamp,
            allDay: z.boolean(),
          })
          .strict(),
      )
      .max(1000),
    unsupported: z.int().nonnegative(),
    truncated: z.boolean(),
  })
  .strict();
const payload = z.object({ source: z.string().regex(/^[a-f0-9]{64}$/), snapshot }).strict();

export type CalendarAgendaSnapshot = z.infer<typeof snapshot>;

function notFound(error: unknown) {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}

export async function readAgendaSnapshot(
  path: string,
  source: string,
): Promise<CalendarAgendaSnapshot | null> {
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.size > MAX_SNAPSHOT_BYTES) return null;
    const input: unknown = JSON.parse(await readFile(path, 'utf8'));
    const result = payload.safeParse(input);
    return result.success && result.data.source === source ? result.data.snapshot : null;
  } catch {
    return null;
  }
}

export async function writeAgendaSnapshot(
  path: string,
  source: string,
  agenda: CalendarAgendaSnapshot,
) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const raw = `${JSON.stringify({ source, snapshot: agenda })}\n`;
    if (Buffer.byteLength(raw) > MAX_SNAPSHOT_BYTES) throw new ConnectorError('STORAGE');
    await writeFile(temporary, raw, { flag: 'wx', mode: 0o600, flush: true });
    await rename(temporary, path);
  } catch {
    try {
      await unlink(temporary);
    } catch (error) {
      if (!notFound(error)) throw new ConnectorError('STORAGE');
    }
    throw new ConnectorError('STORAGE');
  }
}
