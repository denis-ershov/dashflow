import { useEffect, useRef, useState } from 'react';
import { useI18nStore } from '@/core/i18n';
import {
  itemRepository,
  runLegacyMigration,
  type ItemDraft,
  type ItemKind,
  type ItemSource,
  type LegacyMappingEntry,
  type LegacyMigrationRecord,
} from '@/core/items';
import { runLogged } from '@/core/observability';
import { legacyLabels } from '@/features/settings/backupFile';
import { useDashboardStore } from '@/stores/useDashboardStore';

/**
 * Привязка экземпляров виджетов к данным рабочего пространства (шаг 1.4).
 *
 * Экземпляр Todo и «Быстрых ссылок» хранит в настройках `boardId`, «Заметок» — `itemId`.
 * Перед первой привязкой один раз выполняется перенос данных 3.8 (runLegacyMigration):
 * иначе виджет создал бы пустую доску раньше, чем перенеслись его задачи.
 */

/** Источник стартового содержимого (демо-задачи, приветственная заметка) */
export const SEED_SOURCE: ItemSource = { type: 'import', id: 'seed', name: 'seed' };

export type InstanceField = keyof LegacyMappingEntry;

let ready: Promise<LegacyMigrationRecord> | null = null;
const pending = new Map<string, Promise<string>>();

/** Сброс кэша между тестами */
export function resetWorkspaceBindings(): void {
  ready = null;
  pending.clear();
}

function waitForDashboard(): Promise<void> {
  const { persist } = useDashboardStore;
  if (persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/** Привязывает экземпляры, у которых ещё нет своей доски/записи, к перенесённым данным */
function applyMapping(mapping: Readonly<Record<string, LegacyMappingEntry>>): void {
  const { instances, updateWidgetSettings } = useDashboardStore.getState();
  for (const instance of instances) {
    const entry = mapping[instance.instanceId];
    const settings = instance.settings;
    if (entry && settings.boardId === undefined && settings.itemId === undefined) {
      updateWidgetSettings(instance.instanceId, { ...entry });
    }
  }
}

/** Однократно: дождаться загрузки дашборда, перенести данные 3.8, привязать экземпляры */
export function ensureWorkspaceReady(): Promise<LegacyMigrationRecord> {
  if (!ready) {
    ready = (async () => {
      await waitForDashboard();
      const instances = useDashboardStore
        .getState()
        .instances.map(({ instanceId, widgetId }) => ({ instanceId, widgetId }));
      const record = await runLegacyMigration({
        repository: itemRepository,
        instances,
        labels: legacyLabels(useI18nStore.getState().language),
      });
      applyMapping(record.mapping);
      return record;
    })();
    // Сбой (например, квота) не кэшируется: следующая попытка повторит перенос
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

async function isAlive(field: InstanceField, id: string): Promise<boolean> {
  if (field === 'boardId') {
    const board = await itemRepository.getBoard(id);
    return Boolean(board && !board.archivedAt);
  }
  const item = await itemRepository.get(id);
  return Boolean(item && !item.deletedAt);
}

function settingOf(instanceId: string, field: InstanceField): string | undefined {
  const instance = useDashboardStore.getState().instances.find((i) => i.instanceId === instanceId);
  const value = instance?.settings[field];
  return typeof value === 'string' ? value : undefined;
}

/**
 * id доски/записи экземпляра: из настроек, если она жива, иначе создаётся через create и
 * сохраняется в настройках. Одновременные вызовы для одного экземпляра (двойной рендер,
 * несколько хуков) получают один и тот же результат.
 */
export function resolveInstanceTarget(
  instanceId: string,
  field: InstanceField,
  create: () => Promise<string>,
): Promise<string> {
  const key = `${instanceId}:${field}`;
  const existing = pending.get(key);
  if (existing) return existing;

  const task = (async () => {
    await ensureWorkspaceReady();
    const current = settingOf(instanceId, field);
    if (current && (await isAlive(field, current))) return current;
    const created = await create();
    useDashboardStore.getState().updateWidgetSettings(instanceId, { [field]: created });
    return created;
  })();
  pending.set(key, task);
  // Дедупликация нужна только одновременным вызовам: после завершения доска могла быть удалена
  const forget = () => {
    pending.delete(key);
  };
  task.then(forget, forget);
  return task;
}

/** Стартовое содержимое — только если записей такого вида ещё не было вовсе (новый профиль) */
export async function isFirstUseOf(kind: ItemKind): Promise<boolean> {
  const any = await itemRepository.query({
    kind,
    includeArchived: true,
    includeDeleted: true,
    limit: 1,
  });
  return any.length === 0;
}

export async function createSeeds(drafts: readonly ItemDraft[]): Promise<void> {
  for (const draft of drafts) await itemRepository.create(draft, SEED_SOURCE);
}

export interface InstanceTarget {
  id: string | null;
  error: Error | null;
}

/** Хук: доска или запись экземпляра виджета (null, пока идёт перенос или создание) */
export function useInstanceTarget(
  instanceId: string,
  field: InstanceField,
  create: () => Promise<string>,
): InstanceTarget {
  const [state, setState] = useState<InstanceTarget>({ id: null, error: null });
  const createRef = useRef(create);
  createRef.current = create;
  const settingValue = useDashboardStore((s) => {
    const value = s.instances.find((i) => i.instanceId === instanceId)?.settings[field];
    return typeof value === 'string' ? value : undefined;
  });

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      try {
        const id = await resolveInstanceTarget(instanceId, field, () => createRef.current());
        if (!cancelled) setState({ id, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({ id: null, error: error instanceof Error ? error : new Error(String(error)) });
        }
        throw error;
      }
    };
    runLogged(resolve(), 'storage', { stage: 'bind-widget', field });
    return () => {
      cancelled = true;
    };
  }, [instanceId, field, settingValue]);

  return state;
}
