import { t, type SupportedLanguage } from '@/core/i18n';
import {
  LEGACY_MIGRATION_KEY,
  LEGACY_MIGRATION_VERSION,
  convertLegacyContent,
  isLegacyMigrationRecord,
  type ItemRepository,
  type ItemSource,
  type LegacyInstance,
  type LegacyLabels,
  type LegacyMappingEntry,
  type LegacyMigrationRecord,
} from '@/core/items';
import { asArray, asRecord } from '@/core/network/jsonReaders';
import type { WidgetInstance } from '@/core/widget/types';

/**
 * Содержимое рабочего пространства в файле экспорта.
 *
 * Версия 3.0: `items` и `boards` (без корзины) + прежнее поле `content` со старыми ключами —
 * оно остаётся до 3.10.0, чтобы файл можно было импортировать в 3.8 при откате.
 * Импорт 2.x переносит `content` в Item тем же конвертером, что и миграция при запуске.
 */

export const EXPORT_VERSION = '3.0';

export const IMPORT_SOURCE: ItemSource = { type: 'import', id: 'backup-file', name: 'file' };

export function legacyLabels(lang: SupportedLanguage): LegacyLabels {
  return {
    tasks: t('items.legacy.tasks', undefined, lang),
    todoColumn: t('items.legacy.todoColumn', undefined, lang),
    doneColumn: t('items.legacy.doneColumn', undefined, lang),
    links: t('items.legacy.links', undefined, lang),
    note: t('items.legacy.note', undefined, lang),
  };
}

/** Раздел файла экспорта с Item и досками */
export async function exportWorkspaceItems(repository: ItemRepository) {
  return repository.exportAll();
}

export interface ImportItemsResult {
  items: number;
  boards: number;
  /** Привязка экземпляров виджетов к созданным доскам и записям (для файлов 2.x) */
  mapping: Record<string, LegacyMappingEntry>;
}

/**
 * Записи из файла: 3.0 — `items`/`boards` как есть (с полной проверкой), 2.x — конвертация
 * `content`. Записи с тем же id заменяются, остальные данные пользователя не трогаются.
 * После импорта ставится маркер миграции: восстановленные старые ключи не должны
 * повторно переноситься при следующем запуске.
 */
export async function importWorkspaceItems(options: {
  file: Readonly<Record<string, unknown>>;
  repository: ItemRepository;
  instances: readonly WidgetInstance[];
  language: SupportedLanguage;
  now?: Date;
}): Promise<ImportItemsResult> {
  const { file, repository } = options;
  const now = options.now ?? new Date();
  const fileItems = asArray(file.items);
  const fileBoards = asArray(file.boards);

  let items: readonly unknown[] = fileItems;
  let boards: readonly unknown[] = fileBoards;
  let mapping: Record<string, LegacyMappingEntry> = {};
  let skipped = 0;

  const isLegacyFile = fileItems.length === 0 && fileBoards.length === 0;
  if (isLegacyFile && file.content !== undefined) {
    const instances: LegacyInstance[] = options.instances.map(({ instanceId, widgetId }) => ({
      instanceId,
      widgetId,
    }));
    const converted = convertLegacyContent({
      snapshot: asRecord(file.content),
      instances,
      labels: legacyLabels(options.language),
      source: IMPORT_SOURCE,
      now,
    });
    items = converted.items;
    boards = converted.boards;
    mapping = converted.mapping;
    skipped = converted.skipped;
  }

  const existing = await repository.getMeta(LEGACY_MIGRATION_KEY);
  const marker: LegacyMigrationRecord = isLegacyMigrationRecord(existing)
    ? { ...existing, mapping: { ...existing.mapping, ...mapping } }
    : {
        version: LEGACY_MIGRATION_VERSION,
        completedAt: now.toISOString(),
        mapping,
        items: items.length,
        boards: boards.length,
        skipped,
      };

  const written = await repository.importBatch({
    items,
    boards,
    source: IMPORT_SOURCE,
    meta: { key: LEGACY_MIGRATION_KEY, value: marker },
  });
  return { ...written, mapping };
}

/** Привязывает экземпляры виджетов к доскам и записям, созданным из их содержимого */
export function applyItemsMapping(
  instances: readonly WidgetInstance[],
  mapping: Readonly<Record<string, LegacyMappingEntry>>,
): WidgetInstance[] {
  return instances.map((instance) => {
    const entry = mapping[instance.instanceId];
    if (!entry) return instance;
    return { ...instance, settings: { ...instance.settings, ...entry } };
  });
}
