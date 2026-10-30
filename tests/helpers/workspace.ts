import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { itemRepository } from '@/core/items';
import { resetWorkspaceBindings } from '@/features/workspace/bindings';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { WidgetInstance } from '@/core/widget/types';

/**
 * Чистое рабочее пространство для теста виджета: новая база IndexedDB, сброшенная привязка
 * экземпляров, пустое localStorage (старые ключи 3.8) и заданные экземпляры на дашборде.
 */
export async function resetWorkspace(instances: WidgetInstance[]): Promise<void> {
  await itemRepository.close();
  globalThis.indexedDB = new IDBFactory();
  resetWorkspaceBindings();
  localStorage.clear();
  useDashboardStore.setState({ instances });
}

/** Старые ключи 3.8 в хранилище браузера (вне расширения StorageAdapter пишет в localStorage) */
export function seedLegacyKey(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Настройки экземпляра из стора дашборда (сюда виджет записывает boardId / itemId) */
export function instanceSettings(instanceId: string): Record<string, unknown> | undefined {
  return useDashboardStore.getState().instances.find((i) => i.instanceId === instanceId)?.settings;
}
