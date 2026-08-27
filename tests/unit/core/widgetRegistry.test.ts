import { describe, it, expect, beforeEach } from 'vitest';
import { WidgetRegistry } from '@/core/widget/registry';
import type { WidgetDefinition } from '@/core/widget/types';

describe('WidgetRegistry', () => {
  const sampleClock: WidgetDefinition = {
    id: 'clock',
    nameKey: 'widgets.clock',
    descriptionKey: 'widgetDesc.clock',
    version: '2.0.0',
    iconName: 'Clock',
    category: 'productivity',
    surface: 'chromeless',
    size: { defaultW: 4, defaultH: 2 },
    load: () => Promise.resolve({ default: () => null }),
  };

  const sampleWeather: WidgetDefinition = {
    id: 'weather',
    nameKey: 'widgets.weather',
    descriptionKey: 'widgetDesc.weather',
    version: '2.0.0',
    iconName: 'CloudSun',
    category: 'utilities',
    surface: 'panel',
    size: { defaultW: 4, defaultH: 2 },
    load: () => Promise.resolve({ default: () => null }),
  };

  beforeEach(() => {
    WidgetRegistry.clear();
  });

  it('должен регистрировать и возвращать виджет по ID', () => {
    WidgetRegistry.register(sampleClock);
    expect(WidgetRegistry.isRegistered('clock')).toBe(true);
    expect(WidgetRegistry.get('clock')).toEqual(sampleClock);
  });

  it('должен возвращать все зарегистрированные виджеты', () => {
    WidgetRegistry.register(sampleClock);
    WidgetRegistry.register(sampleWeather);

    const all = WidgetRegistry.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((w) => w.id)).toEqual(['clock', 'weather']);
  });

  it('должен фильтровать виджеты по категории', () => {
    WidgetRegistry.register(sampleClock);
    WidgetRegistry.register(sampleWeather);

    const productivity = WidgetRegistry.getByCategory('productivity');
    expect(productivity).toHaveLength(1);
    expect(productivity[0].id).toBe('clock');

    const utilities = WidgetRegistry.getByCategory('utilities');
    expect(utilities).toHaveLength(1);
    expect(utilities[0].id).toBe('weather');

    const empty = WidgetRegistry.getByCategory('finance');
    expect(empty).toHaveLength(0);
  });

  it('при запросе неизвестного виджета getOrFallback() должен возвращать безопасную заглушку', () => {
    const fallback = WidgetRegistry.getOrFallback('deleted_plugin_123');
    expect(fallback.id).toBe('deleted_plugin_123');
    expect(fallback.surface).toBe('panel');
    expect(fallback.nameKey).toBe('errors.widgetFailed');
  });
});
