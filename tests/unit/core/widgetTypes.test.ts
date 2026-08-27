import { describe, it, expect } from 'vitest';
import type {
  WidgetDefinition,
  WidgetProps,
  WidgetSettingFieldSchema,
  WidgetInstance,
} from '@/core/widget/types';

describe('Widget Contracts & Types', () => {
  interface SampleSettings {
    title: string;
    refreshInterval: number;
    showSeconds: boolean;
    themeMode: 'auto' | 'light' | 'dark';
    channels: string[];
  }

  const sampleSchema: WidgetSettingFieldSchema<SampleSettings>[] = [
    {
      key: 'title',
      labelKey: 'common.edit',
      type: 'text',
      defaultValue: 'Мои часы',
    },
    {
      key: 'refreshInterval',
      labelKey: 'common.save',
      type: 'slider',
      defaultValue: 60,
      min: 10,
      max: 300,
      step: 10,
    },
    {
      key: 'showSeconds',
      labelKey: 'common.enabled',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'themeMode',
      labelKey: 'appearance.activeTheme',
      type: 'select',
      defaultValue: 'auto',
      options: [
        { labelKey: 'common.enabled', value: 'auto' },
        { labelKey: 'common.enabled', value: 'light' },
        { labelKey: 'common.disabled', value: 'dark' },
      ],
    },
    {
      key: 'channels',
      labelKey: 'widgets.rssReader',
      type: 'multiselect',
      defaultValue: ['tech', 'news'],
      options: [
        { labelKey: 'common.add', value: 'tech' },
        { labelKey: 'common.add', value: 'news' },
      ],
    },
  ];

  const DummyComponent: React.FC<WidgetProps<SampleSettings>> = () => null;

  it('манифест виджета должен строго соответствовать контракту WidgetDefinition', () => {
    const clockManifest: WidgetDefinition<SampleSettings> = {
      id: 'clock',
      nameKey: 'widgets.clock',
      descriptionKey: 'widgetDesc.clock',
      version: '2.0.0',
      iconName: 'Clock',
      category: 'productivity',
      surface: 'chromeless',
      size: {
        defaultW: 4,
        defaultH: 2,
        minW: 2,
        minH: 1,
      },
      permissions: ['storage'],
      settingsSchema: sampleSchema,
      load: () => Promise.resolve({ default: DummyComponent }),
    };

    expect(clockManifest.id).toBe('clock');
    expect(clockManifest.surface).toBe('chromeless');
    expect(clockManifest.settingsSchema).toHaveLength(5);
  });

  it('инстанс виджета должен содержать instanceId, widgetId и типизированные settings', () => {
    const instance: WidgetInstance<SampleSettings> = {
      instanceId: 'inst-1',
      widgetId: 'clock',
      settings: {
        title: 'Рабочие часы',
        refreshInterval: 30,
        showSeconds: false,
        themeMode: 'dark',
        channels: ['tech'],
      },
    };

    expect(instance.instanceId).toBe('inst-1');
    expect(instance.settings.showSeconds).toBe(false);
  });
});
