import { describe, it, expect, beforeEach } from 'vitest';
import {
  migrateDashboardState,
  deriveResponsiveLayouts,
  isRectangleColliding,
  findFirstAvailablePosition,
  resolveLayoutCollisions,
} from '@/core/storage/dashboardMigrations';
import type { LayoutItem } from '@/core/storage/dashboardMigrations';

describe('Dashboard State Migrations & Collision Resolution', () => {
  const v1State = {
    isEditMode: true,
    isLocked: false,
    columns: 12,
    gap: 16,
    activeModal: 'settings',
    widgets: [
      {
        instanceId: 'clock-1',
        widgetId: 'clock',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        settings: { showSeconds: true },
      },
      {
        instanceId: 'weather-1',
        widgetId: 'weather',
        x: 4,
        y: 0,
        w: 4,
        h: 2,
        settings: { city: 'Москва' },
      },
      { instanceId: 'search-1', widgetId: 'search', x: 8, y: 0, w: 4, h: 2 },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('должен корректно мигрировать v1 плоский массив widgets в instances и layouts по брейкпоинтам', () => {
    const migrated = migrateDashboardState(v1State);

    expect(migrated.version).toBe(2);
    expect(migrated.instances).toHaveLength(3);
    expect(migrated.instances[0]).toEqual({
      instanceId: 'clock-1',
      widgetId: 'clock',
      settings: { showSeconds: true },
    });

    expect(migrated.layouts.xl).toHaveLength(3);
    expect(migrated.layouts.xl[0]).toEqual({
      i: 'clock-1',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
    });

    expect(migrated.layouts.sm).toBeDefined();
    expect(migrated.layouts.sm).toHaveLength(3);
    // На мобильном sm (4 колонки) ширина виджета не должна превышать 4
    for (const item of migrated.layouts.sm) {
      expect(item.w).toBeLessThanOrEqual(4);
      expect(item.x + item.w).toBeLessThanOrEqual(4);
    }
  });

  it('при передаче null или поврежденного состояния должен возвращать дефолтное состояние v2', () => {
    const defaultState = migrateDashboardState(null);
    expect(defaultState.version).toBe(2);
    expect(defaultState.instances.length).toBeGreaterThan(0);
    expect(defaultState.layouts.xl.length).toBeGreaterThan(0);
  });

  it('если состояние уже версии 2, должен возвращать его без повторной миграции', () => {
    const v2State = {
      version: 2,
      baseColumns: 16 as const,
      gap: 24,
      isEditMode: false,
      isLocked: true,
      activeModal: null,
      instances: [{ instanceId: 'test-1', widgetId: 'notes', settings: {} }],
      layouts: {
        xl: [{ i: 'test-1', x: 0, y: 0, w: 6, h: 4 }],
        lg: [{ i: 'test-1', x: 0, y: 0, w: 6, h: 4 }],
        md: [{ i: 'test-1', x: 0, y: 0, w: 4, h: 4 }],
        sm: [{ i: 'test-1', x: 0, y: 0, w: 4, h: 4 }],
        xs: [{ i: 'test-1', x: 0, y: 0, w: 2, h: 4 }],
      },
    };

    const result = migrateDashboardState(v2State);
    expect(result.version).toBe(2);
    expect(result.baseColumns).toBe(16);
    expect(result.instances[0].instanceId).toBe('test-1');
  });

  describe('isRectangleColliding', () => {
    it('должен правильно определять пересечение прямоугольников', () => {
      const a = { x: 0, y: 0, w: 4, h: 2 };
      const b = { x: 2, y: 1, w: 4, h: 2 }; // пересекается
      const c = { x: 4, y: 0, w: 4, h: 2 }; // смежный по x (не пересекается)
      const d = { x: 0, y: 2, w: 4, h: 2 }; // смежный по y (не пересекается)

      expect(isRectangleColliding(a, b)).toBe(true);
      expect(isRectangleColliding(a, c)).toBe(false);
      expect(isRectangleColliding(a, d)).toBe(false);
    });
  });

  describe('findFirstAvailablePosition', () => {
    it('должен находить свободную позицию на первом ряду при наличии места', () => {
      const layout: LayoutItem[] = [{ i: 'w1', x: 0, y: 0, w: 4, h: 2 }];
      const pos = findFirstAvailablePosition(layout, 12, 4, 2);
      expect(pos).toEqual({ x: 4, y: 0 });
    });

    it('должен переносить на следующий ряд, если на текущем ряду нет места', () => {
      const layout: LayoutItem[] = [
        { i: 'w1', x: 0, y: 0, w: 6, h: 3 },
        { i: 'w2', x: 6, y: 0, w: 6, h: 3 },
      ];
      const pos = findFirstAvailablePosition(layout, 12, 4, 2);
      expect(pos).toEqual({ x: 0, y: 3 });
    });
  });

  describe('resolveLayoutCollisions', () => {
    it('должен сдвигать перекрывающиеся виджеты вниз', () => {
      const overlapping: LayoutItem[] = [
        { i: 'w1', x: 0, y: 0, w: 6, h: 3 },
        { i: 'w2', x: 2, y: 1, w: 6, h: 3 }, // перекрывает w1
      ];

      const resolved = resolveLayoutCollisions(overlapping, 12);
      expect(resolved).toHaveLength(2);
      expect(resolved[0]).toEqual({ i: 'w1', x: 0, y: 0, w: 6, h: 3 });
      expect(resolved[1].y).toBeGreaterThanOrEqual(3);
      expect(isRectangleColliding(resolved[0], resolved[1])).toBe(false);
    });
  });

  describe('deriveResponsiveLayouts', () => {
    it('должен безопасно масштабировать позиции и размеры для всех 5 брейкпоинтов без коллизий', () => {
      const baseLayout: LayoutItem[] = [
        { i: 'w1', x: 0, y: 0, w: 8, h: 3 },
        { i: 'w2', x: 8, y: 0, w: 4, h: 3 },
      ];

      const layouts = deriveResponsiveLayouts(baseLayout, 12);
      expect(layouts.xl).toHaveLength(2);
      expect(layouts.lg).toHaveLength(2);
      expect(layouts.md).toHaveLength(2);
      expect(layouts.sm).toHaveLength(2);
      expect(layouts.xs).toHaveLength(2);

      // Проверка для xs (2 колонки)
      for (const item of layouts.xs) {
        expect(item.w).toBeLessThanOrEqual(2);
        expect(item.x + item.w).toBeLessThanOrEqual(2);
      }
      expect(isRectangleColliding(layouts.xs[0], layouts.xs[1])).toBe(false);
    });
  });
});
