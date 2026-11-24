/**
 * Уведомления об изменениях Item между всеми открытыми страницами расширения и сервис-воркером.
 * BroadcastChannel не доставляет сообщение отправителю, поэтому подписчики в той же странице
 * вызываются напрямую.
 */

export interface ItemsChangedEvent {
  type: 'items-changed';
  /** Изменённые записи; пустой список — изменились только доски */
  itemIds: string[];
  boards?: boolean;
}

type Listener = (event: ItemsChangedEvent) => void;

const CHANNEL_NAME = 'dashflow-items';
export const ITEMS_CHANGED_MESSAGE = 'dashflow:items-changed';
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function isItemsChangedEvent(data: unknown): data is ItemsChangedEvent {
  if (typeof data !== 'object' || data === null) return false;
  const event = data as Record<string, unknown>;
  return (
    event.type === 'items-changed' &&
    Array.isArray(event.itemIds) &&
    event.itemIds.every((id) => typeof id === 'string')
  );
}

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (message: MessageEvent<unknown>) => {
    if (isItemsChangedEvent(message.data)) {
      listeners.forEach((listener) => listener(message.data as ItemsChangedEvent));
    }
  };
  return channel;
}

export function publishItemsChanged(event: ItemsChangedEvent): void {
  listeners.forEach((listener) => listener(event));
  getChannel()?.postMessage(event);
  // BroadcastChannel синхронизирует открытые страницы, а runtime будит спящий воркер.
  if (
    typeof window !== 'undefined' &&
    typeof globalThis.chrome?.runtime?.sendMessage === 'function' &&
    (event.itemIds.length || event.boards)
  ) {
    try {
      chrome.runtime.sendMessage(
        { type: ITEMS_CHANGED_MESSAGE },
        () => void chrome.runtime.lastError,
      );
    } catch {
      // Если контекст обновлён, новое расписание восстановится при запуске расширения.
    }
  }
}

/** Подписка на изменения из этой и других страниц; возвращает функцию отписки */
export function subscribeItemsChanged(listener: Listener): () => void {
  getChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
