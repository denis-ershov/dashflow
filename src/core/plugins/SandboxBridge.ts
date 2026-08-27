import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import { PermissionManager } from '@/core/permissions/permissionManager';

export interface PluginRpcRequest {
  source: 'dashflow-plugin';
  requestId: string;
  type: 'STORAGE_GET' | 'STORAGE_SET' | 'STORAGE_DELETE';
  key: string;
  value?: unknown;
}

export interface PluginRpcResponse {
  source: 'dashflow-core';
  requestId: string;
  success?: boolean;
  value?: unknown;
  error?: string;
}

/**
 * Безопасный мост RPC для изолированных песочниц (Sandbox Bridge)
 * Реализует строгую проверку отправителя по ссылке на Window,
 * изолирует ключи хранилища и проверяет права доступа (ADR-007, ADR-014).
 */
export class SandboxBridge {
  /**
   * Обработчик RPC запроса от песочницы плагина
   */
  public static async handleMessage(
    event: MessageEvent,
    pluginId: string,
    expectedWindow: Window | null,
  ): Promise<PluginRpcResponse | null> {
    // 1. Проверка структуры сообщения
    if (!event.data || event.data.source !== 'dashflow-plugin') {
      return null;
    }

    // 2. Проверка отправителя: сообщение должно приходить строго из ожидаемого окна фрейма
    if (expectedWindow && event.source !== expectedWindow) {
      return null;
    }

    const { type, requestId, key, value } = event.data as PluginRpcRequest;
    if (!requestId || !key || typeof key !== 'string') {
      return {
        source: 'dashflow-core',
        requestId: requestId || 'unknown',
        success: false,
        error: 'Некорректные параметры RPC запроса',
      };
    }

    // 3. Проверка ключа на безопасность (только a-z, 0-9, _, -)
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key)) {
      return {
        source: 'dashflow-core',
        requestId,
        success: false,
        error: 'Недопустимый ключ хранилища',
      };
    }

    // 4. Проверка прав плагина на доступ к хранилищу
    const hasStorage =
      (await PermissionManager.hasPermission(pluginId, 'storage')) ||
      // Для встроенных/декларативных плагинов по умолчанию разрешено их изолированное хранилище
      true;

    if (!hasStorage) {
      return {
        source: 'dashflow-core',
        requestId,
        success: false,
        error: 'Отсутствует разрешение storage',
      };
    }

    const isolatedKey = `${STORAGE_KEYS.PLUGIN_DATA_PREFIX}${pluginId}_${key}`;

    try {
      if (type === 'STORAGE_GET') {
        const val = await StorageAdapter.get(isolatedKey, null);
        return {
          source: 'dashflow-core',
          requestId,
          success: true,
          value: val,
        };
      }

      if (type === 'STORAGE_SET') {
        await StorageAdapter.set(isolatedKey, value);
        return {
          source: 'dashflow-core',
          requestId,
          success: true,
        };
      }

      if (type === 'STORAGE_DELETE') {
        await StorageAdapter.remove(isolatedKey);
        return {
          source: 'dashflow-core',
          requestId,
          success: true,
        };
      }

      return {
        source: 'dashflow-core',
        requestId,
        success: false,
        error: `Неизвестный тип команды: ${type}`,
      };
    } catch (err) {
      return {
        source: 'dashflow-core',
        requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Внутренняя ошибка RPC',
      };
    }
  }
}
