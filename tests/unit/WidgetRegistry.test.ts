import { describe, it, expect } from 'vitest';
import { WidgetRegistry } from '../../src/widgets/core/WidgetRegistry';
import { registerBuiltInWidgets } from '../../src/widgets/built-in';

describe('WidgetRegistry', () => {
  it('должен успешно регистрировать встроенные виджеты', () => {
    registerBuiltInWidgets();
    const all = WidgetRegistry.getAll();

    expect(all.length).toBeGreaterThanOrEqual(7);
    expect(WidgetRegistry.get('clock')).toBeDefined();
    expect(WidgetRegistry.get('weather')).toBeDefined();
    expect(WidgetRegistry.get('todo')).toBeDefined();
  });

  it('должен фильтровать виджеты по категории', () => {
    registerBuiltInWidgets();
    const productivity = WidgetRegistry.getByCategory('productivity');

    expect(productivity.length).toBeGreaterThan(0);
    expect(productivity.some((w) => w.id === 'todo')).toBe(true);
  });
});
