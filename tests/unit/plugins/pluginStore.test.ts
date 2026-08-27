import { describe, it, expect, beforeEach } from 'vitest';
import { usePluginStore } from '@/core/plugins/pluginStore';
import { WidgetRegistry } from '@/core/widget/registry';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';

describe('Plugin Store', () => {
  beforeEach(async () => {
    WidgetRegistry.clear();
    await StorageAdapter.set(STORAGE_KEYS.CUSTOM_PLUGINS, []);
    usePluginStore.setState({ plugins: [], isLoaded: false });
  });

  it('должен успешно устанавливать валидный декларативный плагин и регистрировать его в WidgetRegistry', async () => {
    const validManifest = {
      id: 'custom_wiki',
      name: 'Custom Wiki',
      version: '1.0.0',
      author: 'Community',
      type: 'embed' as const,
      description: 'Wikipedia embed',
      permissions: ['storage' as const],
      size: { defaultW: 6, defaultH: 4 },
      config: {
        url: 'https://en.wikipedia.org',
      },
    };

    const res = await usePluginStore.getState().installPlugin(validManifest);
    expect(res.success).toBe(true);

    expect(usePluginStore.getState().plugins).toHaveLength(1);
    expect(WidgetRegistry.has('custom_wiki')).toBe(true);

    const registered = WidgetRegistry.get('custom_wiki');
    expect(registered?.name).toBe('Custom Wiki');
    expect(registered?.author).toBe('Community');
  });

  it('должен отклонять установку невалидного манифеста', async () => {
    const invalid = { id: 'invalid_plugin' };
    const res = await usePluginStore.getState().installPlugin(invalid);
    expect(res.success).toBe(false);
    expect(res.errors).toBeDefined();
    expect(usePluginStore.getState().plugins).toHaveLength(0);
  });

  it('должен удалять плагин и дерегистрировать его из WidgetRegistry', async () => {
    const manifest = {
      id: 'temp_feed',
      name: 'Temp Feed',
      version: '1.0.0',
      author: 'Tester',
      type: 'rss' as const,
      description: 'Temp RSS',
      permissions: ['network' as const],
      size: { defaultW: 4, defaultH: 4 },
      config: {
        feedUrl: 'https://example.com/rss.xml',
      },
    };

    await usePluginStore.getState().installPlugin(manifest);
    expect(WidgetRegistry.has('temp_feed')).toBe(true);

    const deleted = await usePluginStore.getState().uninstallPlugin('temp_feed');
    expect(deleted).toBe(true);
    expect(WidgetRegistry.has('temp_feed')).toBe(false);
    expect(usePluginStore.getState().plugins).toHaveLength(0);
  });
});
