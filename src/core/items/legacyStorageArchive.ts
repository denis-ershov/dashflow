import { asRecord } from '@/core/network/jsonReaders';
import { collectUserContent, StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import type { LegacyMigrationRecord } from './migration';

/** Переносит старые ключи известно мигрировавших виджетов в локальный резерв для отката. */
export async function archiveLegacyWidgetContent(
  record: LegacyMigrationRecord,
  instanceIds: readonly string[],
): Promise<void> {
  // При неполном переносе все исходники должны оставаться на месте.
  if (record.skipped !== 0) return;

  const snapshot = await collectUserContent(instanceIds, ['todos', 'notes', 'links']);
  const entries = Object.entries(snapshot);
  if (entries.length === 0) return;

  await StorageAdapter.updateLarge(STORAGE_KEYS.LEGACY_WIDGET_CONTENT_ARCHIVE, (current) => ({
    ...asRecord(current),
    ...snapshot,
  }));
  await Promise.all(
    entries.map(async ([key, value]) => {
      const current = await StorageAdapter.get<unknown>(key, undefined);
      if (JSON.stringify(current) === JSON.stringify(value)) await StorageAdapter.remove(key);
    }),
  );
}
