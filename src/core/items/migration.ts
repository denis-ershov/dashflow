import { collectUserContent } from '@/core/storage/userContent';
import {
  convertLegacyContent,
  type LegacyInstance,
  type LegacyLabels,
  type LegacyMappingEntry,
} from './legacy';
import type { ItemRepository } from './repository';
import type { ItemSource } from './types';

/**
 * Однократный перенос содержимого виджетов 3.8 в Item.
 *
 * Идемпотентность: маркер `legacyMigration` пишется в meta той же транзакцией, что и
 * записи (importBatch), — либо перенесено всё и есть маркер, либо ничего. Повторный запуск
 * при наличии маркера ничего не делает. Старые ключи хранилища не удаляются до 3.10.0:
 * откат на 3.8 видит прежние данные.
 */

export const LEGACY_MIGRATION_KEY = 'legacyMigration';
export const LEGACY_MIGRATION_VERSION = 1;

export const MIGRATION_SOURCE: ItemSource = { type: 'import', id: 'legacy-3-8', name: '3.8' };

export interface LegacyMigrationRecord {
  version: number;
  completedAt: string;
  /** instanceId → доска или запись, созданная для этого экземпляра виджета */
  mapping: Record<string, LegacyMappingEntry>;
  items: number;
  boards: number;
  skipped: number;
}

export function isLegacyMigrationRecord(value: unknown): value is LegacyMigrationRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === LEGACY_MIGRATION_VERSION &&
    typeof record.completedAt === 'string' &&
    typeof record.mapping === 'object' &&
    record.mapping !== null
  );
}

export interface RunLegacyMigrationOptions {
  repository: ItemRepository;
  instances: readonly LegacyInstance[];
  labels: LegacyLabels;
  now?: Date;
  /** Источник снимка старых ключей; по умолчанию — хранилище расширения */
  readSnapshot?: (instanceIds: readonly string[]) => Promise<Record<string, unknown>>;
}

export async function runLegacyMigration(
  options: RunLegacyMigrationOptions,
): Promise<LegacyMigrationRecord> {
  const existing = await options.repository.getMeta(LEGACY_MIGRATION_KEY);
  if (isLegacyMigrationRecord(existing)) return existing;

  const instanceIds = options.instances.map((instance) => instance.instanceId);
  const snapshot = await (options.readSnapshot ?? collectUserContent)(instanceIds);
  const now = options.now ?? new Date();
  const converted = convertLegacyContent({
    snapshot,
    instances: options.instances,
    labels: options.labels,
    source: MIGRATION_SOURCE,
    now,
  });

  const record: LegacyMigrationRecord = {
    version: LEGACY_MIGRATION_VERSION,
    completedAt: now.toISOString(),
    mapping: converted.mapping,
    items: converted.items.length,
    boards: converted.boards.length,
    skipped: converted.skipped,
  };
  await options.repository.importBatch({
    items: converted.items,
    boards: converted.boards,
    source: MIGRATION_SOURCE,
    meta: { key: LEGACY_MIGRATION_KEY, value: record },
  });
  return record;
}
