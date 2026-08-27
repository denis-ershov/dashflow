import { describe, it, expect } from 'vitest';
import { computeResponsiveRowHeight } from '@/features/dashboard/hooks/useGridMetrics';

describe('useGridMetrics & computeResponsiveRowHeight', () => {
  it('должен вычислять квадратную высоту ячейки при нормальной ширине экрана', () => {
    // containerWidth = 1200, cols = 12, margin = 16, padding = 0
    // totalGap = 11 * 16 = 176
    // availableWidth = 1200 - 176 = 1024
    // cellWidth = 1024 / 12 = 85.33 -> 85 px
    const rowHeight = computeResponsiveRowHeight({
      containerWidth: 1200,
      cols: 12,
      marginX: 16,
      minRowHeight: 72,
      maxRowHeight: 140,
    });

    expect(rowHeight).toBe(85);
  });

  it('должен ограничивать высоту снизу минимальным порогом (minRowHeight = 72)', () => {
    // Узкий контейнер с большим числом колонок
    const rowHeight = computeResponsiveRowHeight({
      containerWidth: 600,
      cols: 12,
      marginX: 16,
      minRowHeight: 72,
      maxRowHeight: 140,
    });

    expect(rowHeight).toBe(72);
  });

  it('должен ограничивать высоту сверху максимальным порогом (maxRowHeight = 140)', () => {
    // 4K монитор (3840 px) с 12 колонками
    const rowHeight = computeResponsiveRowHeight({
      containerWidth: 3840,
      cols: 12,
      marginX: 16,
      minRowHeight: 72,
      maxRowHeight: 140,
    });

    expect(rowHeight).toBe(140);
  });

  it('должен корректно рассчитывать высоту для мобильного экрана (iPhone SE, 375 px, 4 колонки)', () => {
    // containerWidth = 375, cols = 4, margin = 8
    // totalGap = 3 * 8 = 24
    // availableWidth = 375 - 24 = 351
    // cellWidth = 351 / 4 = 87.75 -> 88 px
    const rowHeight = computeResponsiveRowHeight({
      containerWidth: 375,
      cols: 4,
      marginX: 8,
      minRowHeight: 72,
      maxRowHeight: 140,
    });

    expect(rowHeight).toBe(88);
  });
});
