import { create } from 'zustand';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import { WidgetRegistry } from '@/core/widget/registry';
import { WidgetManifest, WidgetProps } from '@/core/widget/types';
import type { IframeSettings } from '@/widgets/built-in/IframeWidget/types';
import type { RssSettings } from '@/widgets/built-in/RssWidget/types';
import { DeclarativePluginManifest, EmbedPluginConfig, RssPluginConfig } from './types';
import { validatePluginManifest } from './validator';

export interface PluginState {
  plugins: DeclarativePluginManifest[];
  isLoaded: boolean;
  loadPlugins: () => Promise<void>;
  installPlugin: (manifest: unknown) => Promise<{ success: boolean; errors?: string[] }>;
  uninstallPlugin: (pluginId: string) => Promise<boolean>;
  getPlugin: (pluginId: string) => DeclarativePluginManifest | undefined;
}

/**
 * Создает манифест виджета на основе декларативного манифеста плагина
 */
export const createWidgetManifestFromPlugin = (plugin: DeclarativePluginManifest): WidgetManifest => {
  return {
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    version: plugin.version,
    author: plugin.author,
    category: 'utilities',
    size: plugin.size,
    surface: plugin.surface || 'panel',
    permissions: plugin.permissions,
    load: async () => {
      // Ленивая загрузка соответствующего шаблонного компонента
      if (plugin.type === 'embed') {
        const { IframeWidget: IframeComponent } = await import('@/widgets/built-in/IframeWidget/IframeWidget');
        return {
          default: (props: WidgetProps<Record<string, unknown>>) => {
            const embedCfg = plugin.config as EmbedPluginConfig;
            const mergedSettings: IframeSettings = {
              ...(props.settings as unknown as Partial<IframeSettings>),
              url: embedCfg.url,
            };
            return IframeComponent({ ...props, settings: mergedSettings });
          },
        };
      }
      if (plugin.type === 'rss') {
        const { RssWidget: RssComponent } = await import('@/widgets/built-in/RssWidget/RssWidget');
        return {
          default: (props: WidgetProps<Record<string, unknown>>) => {
            const rssCfg = plugin.config as RssPluginConfig;
            const mergedSettings: RssSettings = {
              ...(props.settings as unknown as Partial<RssSettings>),
              feedUrl: rssCfg.feedUrl,
            };
            return RssComponent({ ...props, settings: mergedSettings });
          },
        };
      }
      if (plugin.type === 'links') {
        const { QuickLinksWidget: QuickLinksComponent } = await import('@/widgets/built-in/QuickLinksWidget/QuickLinksWidget');
        return {
          default: (props: WidgetProps<Record<string, unknown>>) => {
            return QuickLinksComponent(props);
          },
        };
      }

      // По умолчанию fallback рендерер песочницы
      const { PluginHost } = await import('@/widgets/sandbox/PluginHost');
      return {
        default: (props: WidgetProps<Record<string, unknown>>) =>
          PluginHost({ pluginId: plugin.id, instanceId: props.instanceId }),
      };
    },
  };
};

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  isLoaded: false,

  loadPlugins: async () => {
    try {
      const saved = await StorageAdapter.get<DeclarativePluginManifest[]>(
        STORAGE_KEYS.CUSTOM_PLUGINS,
        [],
      );
      const validPlugins: DeclarativePluginManifest[] = [];

      for (const p of saved || []) {
        const check = validatePluginManifest(p);
        if (check.valid && check.manifest) {
          validPlugins.push(check.manifest);
          // Регистрируем плагин в общем реестре виджетов
          WidgetRegistry.register(createWidgetManifestFromPlugin(check.manifest));
        }
      }

      set({ plugins: validPlugins, isLoaded: true });
    } catch {
      set({ plugins: [], isLoaded: true });
    }
  },

  installPlugin: async (input: unknown) => {
    const validation = validatePluginManifest(input);
    if (!validation.valid || !validation.manifest) {
      return { success: false, errors: validation.errors || ['Невалидный манифест плагина'] };
    }

    const manifest = validation.manifest;
    const current = get().plugins;

    // Проверяем, не существует ли уже такой ID
    if (WidgetRegistry.has(manifest.id) && !current.some((p) => p.id === manifest.id)) {
      return {
        success: false,
        errors: [`Идентификатор "${manifest.id}" уже занят встроенным виджетом`],
      };
    }

    const filtered = current.filter((p) => p.id !== manifest.id);
    const updated = [...filtered, manifest];

    // Регистрируем в реестре
    WidgetRegistry.register(createWidgetManifestFromPlugin(manifest));

    // Сохраняем в хранилище
    await StorageAdapter.set(STORAGE_KEYS.CUSTOM_PLUGINS, updated);
    set({ plugins: updated });

    return { success: true };
  },

  uninstallPlugin: async (pluginId: string) => {
    const current = get().plugins;
    const updated = current.filter((p) => p.id !== pluginId);
    if (updated.length === current.length) return false;

    WidgetRegistry.unregister(pluginId);
    await StorageAdapter.set(STORAGE_KEYS.CUSTOM_PLUGINS, updated);
    set({ plugins: updated });
    return true;
  },

  getPlugin: (pluginId: string) => {
    return get().plugins.find((p) => p.id === pluginId);
  },
}));
