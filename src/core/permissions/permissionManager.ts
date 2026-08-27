import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import {
  PermissionType,
  PermissionGrant,
  PermissionGrantsMap,
  PERMISSION_DEFINITIONS,
} from './types';

export class PermissionManager {
  /**
   * Получение всех выданных согласий
   */
  public static async getAllGrants(): Promise<PermissionGrantsMap> {
    try {
      const grants = await StorageAdapter.get<PermissionGrantsMap>(
        STORAGE_KEYS.PERMISSION_GRANTS,
        {},
      );
      return grants || {};
    } catch {
      return {};
    }
  }

  /**
   * Проверка, есть ли у виджета/плагина конкретное разрешение
   */
  public static async hasPermission(
    widgetId: string,
    permission: PermissionType,
  ): Promise<boolean> {
    const grants = await this.getAllGrants();
    const grant = grants[widgetId];
    if (!grant) return false;
    return grant.permissions.includes(permission);
  }

  /**
   * Проверка, требуется ли диалог запроса согласия перед установкой
   */
  public static async isConsentRequired(
    widgetId: string,
    requestedPermissions: string[] = [],
  ): Promise<boolean> {
    const sensitivePerms = requestedPermissions.filter((p) => {
      const def = PERMISSION_DEFINITIONS[p as PermissionType];
      return def?.isSensitive;
    }) as PermissionType[];

    if (sensitivePerms.length === 0) return false;

    const grants = await this.getAllGrants();
    const existing = grants[widgetId];

    if (!existing) return true;

    // Проверяем, предоставлены ли все запрошенные чувствительные права
    const missing = sensitivePerms.filter((p) => !existing.permissions.includes(p));
    return missing.length > 0;
  }

  /**
   * Предоставление разрешений виджету
   */
  public static async grantPermissions(
    widgetId: string,
    permissions: PermissionType[],
  ): Promise<void> {
    const grants = await this.getAllGrants();
    const existingPerms = grants[widgetId]?.permissions || [];
    const merged = Array.from(new Set([...existingPerms, ...permissions]));

    const newGrant: PermissionGrant = {
      widgetId,
      permissions: merged,
      grantedAt: new Date().toISOString(),
    };

    grants[widgetId] = newGrant;
    await StorageAdapter.set(STORAGE_KEYS.PERMISSION_GRANTS, grants);
  }

  /**
   * Отзыв разрешений у виджета
   */
  public static async revokePermissions(widgetId: string): Promise<void> {
    const grants = await this.getAllGrants();
    if (grants[widgetId]) {
      delete grants[widgetId];
      await StorageAdapter.set(STORAGE_KEYS.PERMISSION_GRANTS, grants);
    }
  }
}
