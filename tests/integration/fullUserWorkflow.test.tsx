import { describe, it, expect, beforeEach } from 'vitest';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useThemeStore } from '@/core/theme/themeStore';
import { usePluginStore } from '@/core/plugins/pluginStore';
import { PermissionManager } from '@/core/permissions/permissionManager';
import { WidgetRegistry } from '@/core/widget/registry';
import { validateCustomCss } from '@/core/theme/cssValidator';
import { registerBuiltInWidgets } from '@/widgets/built-in/registry';

describe('Integration: Full User Workflow & Core Resilience', () => {
  beforeEach(async () => {
    // Чистим память и хранилище
    WidgetRegistry.clear();
    registerBuiltInWidgets();
    await StorageAdapter.set(STORAGE_KEYS.DASHBOARD, {
      version: 2,
      instances: [],
      layouts: { xl: [], lg: [], md: [], sm: [], xs: [] },
    });
    await StorageAdapter.set(STORAGE_KEYS.CUSTOM_PLUGINS, []);
    await StorageAdapter.set(STORAGE_KEYS.PERMISSION_GRANTS, {});

    useDashboardStore.setState({
      instances: [],
      layouts: { xl: [], lg: [], md: [], sm: [], xs: [] },
      widgets: [],
      isEditMode: false,
      activeModal: null,
    });

    usePluginStore.setState({
      plugins: [],
      isLoaded: false,
    });
  });

  it('должен проходить полный жизненный цикл управления виджетами на дашборде', () => {
    const initialCount = useDashboardStore.getState().widgets.length;

    // 1. Добавление виджета часов
    useDashboardStore.getState().addWidget('clock');
    expect(useDashboardStore.getState().widgets).toHaveLength(initialCount + 1);
    const clockInstance =
      useDashboardStore.getState().widgets[useDashboardStore.getState().widgets.length - 1];
    expect(clockInstance.widgetId).toBe('clock');
    expect(clockInstance.instanceId).toBeDefined();

    // 2. Добавление виджета заметок
    useDashboardStore.getState().addWidget('notes');
    expect(useDashboardStore.getState().widgets).toHaveLength(initialCount + 2);

    // 3. Обновление настроек виджета
    useDashboardStore
      .getState()
      .updateWidgetSettings(clockInstance.instanceId, { is24Hour: false, showSeconds: true });
    const updated = useDashboardStore
      .getState()
      .widgets.find((w) => w.instanceId === clockInstance.instanceId);
    expect(updated?.settings).toEqual({ is24Hour: false, showSeconds: true });

    // 4. Переключение режима редактирования
    expect(useDashboardStore.getState().isEditMode).toBe(false);
    useDashboardStore.getState().toggleEditMode();
    expect(useDashboardStore.getState().isEditMode).toBe(true);

    // 5. Удаление виджета
    useDashboardStore.getState().removeWidget(clockInstance.instanceId);
    expect(useDashboardStore.getState().widgets).toHaveLength(initialCount + 1);
  });

  it('должен проходить полный сценарий смены тем, пресетов и валидации CSS', () => {
    const themeStore = useThemeStore.getState();

    // 1. Смена пресета
    themeStore.setPreset('midnight');
    expect(useThemeStore.getState().activePresetId).toBe('midnight');

    // 2. Смена обоев и затемнения
    themeStore.setWallpaper('https://images.unsplash.com/photo-test', 0.5);
    expect(useThemeStore.getState().wallpaperUrl).toBe('https://images.unsplash.com/photo-test');
    expect(useThemeStore.getState().scrim).toBe(0.5);

    // 3. Безопасная валидация пользовательского CSS
    const safeCss = '.dashflow-card { border-radius: 8px; }';
    const validationRes = validateCustomCss(safeCss);
    expect(validationRes.ok).toBe(true);

    // 4. Блокировка опасного CSS с @import или javascript:
    const dangerousCss = '@import url("https://evil.com/leak.css");';
    const badValidation = validateCustomCss(dangerousCss);
    expect(badValidation.ok).toBe(false);
  });

  it('должен проходить сквозной сценарий установки декларативного плагина и выдачи прав', async () => {
    const pluginManifest = {
      id: 'custom_tech_news',
      name: 'Tech News Feed',
      version: '1.0.0',
      author: 'DashFlow Dev',
      type: 'rss' as const,
      description: 'RSS лента технологий',
      permissions: ['network' as const],
      size: { defaultW: 6, defaultH: 4 },
      config: {
        feedUrl: 'https://news.ycombinator.com/rss',
      },
    };

    // 1. Проверка прав до установки
    const hasInitialPerm = await PermissionManager.hasPermission('custom_tech_news', 'network');
    expect(hasInitialPerm).toBe(false);

    // 2. Выдача разрешений через PermissionManager
    await PermissionManager.grantPermissions('custom_tech_news', ['network']);
    const hasGrantedPerm = await PermissionManager.hasPermission('custom_tech_news', 'network');
    expect(hasGrantedPerm).toBe(true);

    // 3. Установка декларативного плагина
    const installRes = await usePluginStore.getState().installPlugin(pluginManifest);
    expect(installRes.success).toBe(true);

    // 4. Плагин зарегистрирован в WidgetRegistry
    expect(WidgetRegistry.has('custom_tech_news')).toBe(true);
    const widgetDef = WidgetRegistry.get('custom_tech_news');
    expect(widgetDef?.name).toBe('Tech News Feed');

    // 5. Отзыв прав
    await PermissionManager.revokePermissions('custom_tech_news');
    const isRevoked = await PermissionManager.hasPermission('custom_tech_news', 'network');
    expect(isRevoked).toBe(false);

    // 6. Удаление плагина
    await usePluginStore.getState().uninstallPlugin('custom_tech_news');
    expect(WidgetRegistry.has('custom_tech_news')).toBe(false);
  });
});
