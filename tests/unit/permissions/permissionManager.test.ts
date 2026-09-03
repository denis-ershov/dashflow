import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager } from '@/core/permissions/permissionManager';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';

describe('Permission Manager', () => {
  beforeEach(async () => {
    await StorageAdapter.set(STORAGE_KEYS.PERMISSION_GRANTS, {});
  });

  it('должен определять, требуется ли согласие для чувствительных разрешений', async () => {
    // Без разрешений или только storage — согласие не требуется
    expect(await PermissionManager.isConsentRequired('clock', [])).toBe(false);
    expect(await PermissionManager.isConsentRequired('notes', ['storage'])).toBe(false);

    // Чувствительные разрешения (network, bookmarks) — требуется
    expect(await PermissionManager.isConsentRequired('rssReader', ['network', 'storage'])).toBe(
      true,
    );
    expect(await PermissionManager.isConsentRequired('bookmarks', ['bookmarks'])).toBe(true);
  });

  it('должен сохранять и проверять выданные разрешения', async () => {
    expect(await PermissionManager.hasPermission('weather', 'network')).toBe(false);

    await PermissionManager.grantPermissions('weather', ['network', 'geolocation']);

    expect(await PermissionManager.hasPermission('weather', 'network')).toBe(true);
    expect(await PermissionManager.hasPermission('weather', 'geolocation')).toBe(true);
    expect(await PermissionManager.hasPermission('weather', 'bookmarks')).toBe(false);

    // После выдачи прав диалог больше не требуется
    expect(await PermissionManager.isConsentRequired('weather', ['network'])).toBe(false);
  });

  it('должен корректно отзывать разрешения', async () => {
    await PermissionManager.grantPermissions('custom_rss', ['network']);
    expect(await PermissionManager.hasPermission('custom_rss', 'network')).toBe(true);

    await PermissionManager.revokePermissions('custom_rss');
    expect(await PermissionManager.hasPermission('custom_rss', 'network')).toBe(false);
  });
});
