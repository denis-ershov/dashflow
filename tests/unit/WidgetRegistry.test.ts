import { describe, it, expect } from 'vitest';
import { WidgetRegistry } from '@/core/widget/registry';
import { registerBuiltInWidgets, BUILT_IN_MANIFESTS } from '@/widgets/built-in';

describe('WidgetRegistry & Built-in Widgets', () => {
  it('должен успешно регистрировать все встроенные манифесты виджетов', () => {
    registerBuiltInWidgets();
    const all = WidgetRegistry.getAll();

    const expectedIds = [
      'clock',
      'search',
      'greeting',
      'yearProgress',
      'weather',
      'todo',
      'inbox',
      'digest',
      'agenda',
      'kanban',
      'notes',
      'quickLinks',
      'bookmarks',
      'iframe',
      'pomodoro',
      'quotes',
      'systemMonitor',
      'rssReader',
    ];

    expect(all).toHaveLength(expectedIds.length);
    expect(BUILT_IN_MANIFESTS).toHaveLength(expectedIds.length);
    for (const id of expectedIds) {
      expect(WidgetRegistry.get(id)).toBeDefined();
    }
  });

  it('должен корректно фильтровать виджеты по категориям', () => {
    registerBuiltInWidgets();
    const hero = WidgetRegistry.getByCategory('hero');
    const productivity = WidgetRegistry.getByCategory('productivity');
    const utilities = WidgetRegistry.getByCategory('utilities');

    expect(hero.length).toBeGreaterThanOrEqual(4);
    expect(hero.some((w) => w.id === 'clock')).toBe(true);
    expect(hero.some((w) => w.id === 'search')).toBe(true);
    expect(hero.some((w) => w.id === 'greeting')).toBe(true);
    expect(hero.some((w) => w.id === 'yearProgress')).toBe(true);

    expect(productivity.length).toBeGreaterThan(0);
    expect(productivity.some((w) => w.id === 'todo')).toBe(true);
    expect(productivity.some((w) => w.id === 'notes')).toBe(true);
    expect(productivity.some((w) => w.id === 'bookmarks')).toBe(true);
    expect(productivity.some((w) => w.id === 'quickLinks')).toBe(true);
    expect(productivity.some((w) => w.id === 'pomodoro')).toBe(true);

    expect(utilities.some((w) => w.id === 'weather')).toBe(true);
    expect(utilities.some((w) => w.id === 'iframe')).toBe(true);
  });
});
