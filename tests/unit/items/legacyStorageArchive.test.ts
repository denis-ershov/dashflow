import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import { archiveLegacyWidgetContent } from '@/core/items/legacyStorageArchive';
import type { LegacyMigrationRecord } from '@/core/items/migration';

const record: LegacyMigrationRecord = {
  version: 1,
  completedAt: '2026-11-24T00:00:00Z',
  mapping: {},
  items: 1,
  boards: 0,
  skipped: 0,
};
const noteKey = `${STORAGE_KEYS.NOTES_CONTENT}_notes-1`;

beforeEach(async () => {
  localStorage.clear();
  await StorageAdapter.setLarge(STORAGE_KEYS.LEGACY_WIDGET_CONTENT_ARCHIVE, {});
  await StorageAdapter.set(noteKey, 'Перенесённая заметка');
  await StorageAdapter.set(STORAGE_KEYS.HABIT_ITEMS, []);
});

describe('Резерв старых ключей после обновления', () => {
  it('сохраняет исходник до удаления и оставляет привычки в прежнем ключе', async () => {
    await archiveLegacyWidgetContent(record, ['notes-1']);
    expect(await StorageAdapter.get(noteKey, null)).toBeNull();
    expect(await StorageAdapter.get(STORAGE_KEYS.HABIT_ITEMS, null)).toEqual([]);
    expect(await StorageAdapter.getLarge(STORAGE_KEYS.LEGACY_WIDGET_CONTENT_ARCHIVE)).toEqual({
      [noteKey]: 'Перенесённая заметка',
    });
  });

  it('оставляет старые ключи при частичной миграции', async () => {
    await archiveLegacyWidgetContent({ ...record, skipped: 1 }, ['notes-1']);
    expect(await StorageAdapter.get(noteKey, null)).toBe('Перенесённая заметка');
    expect(await StorageAdapter.getLarge(STORAGE_KEYS.LEGACY_WIDGET_CONTENT_ARCHIVE)).toEqual({});
  });
});
