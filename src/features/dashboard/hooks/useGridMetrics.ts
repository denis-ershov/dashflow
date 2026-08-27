import { useState, useEffect, useCallback } from 'react';

export interface ComputeRowHeightOptions {
  containerWidth: number;
  cols: number;
  marginX?: number;
  paddingX?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
}

export const DEFAULT_MIN_ROW_HEIGHT = 72;
export const DEFAULT_MAX_ROW_HEIGHT = 140;

/**
 * Чистая функция расчета высоты ряда сетки для сохранения пропорций квадратной ячейки
 * с безопасными ограничениями 72–140 px (Спецификация Секция 3)
 */
export function computeResponsiveRowHeight({
  containerWidth,
  cols,
  marginX = 16,
  paddingX = 0,
  minRowHeight = DEFAULT_MIN_ROW_HEIGHT,
  maxRowHeight = DEFAULT_MAX_ROW_HEIGHT,
}: ComputeRowHeightOptions): number {
  if (containerWidth <= 0 || cols <= 0) {
    return DEFAULT_MIN_ROW_HEIGHT;
  }

  const totalGap = Math.max(0, (cols - 1) * marginX);
  const totalPadding = Math.max(0, paddingX * 2);
  const availableWidth = Math.max(0, containerWidth - totalGap - totalPadding);
  const rawCellWidth = availableWidth / cols;

  const boundedHeight = Math.max(minRowHeight, Math.min(maxRowHeight, Math.round(rawCellWidth)));
  return boundedHeight;
}

export interface UseGridMetricsOptions {
  containerRef: React.RefObject<HTMLElement>;
  cols: number;
  margin?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
}

/**
 * Реактивный хук для автоматического измерения ширины контейнера и расчета высоты ряда сетки
 */
export function useGridMetrics({
  containerRef,
  cols,
  margin = 16,
  minRowHeight = DEFAULT_MIN_ROW_HEIGHT,
  maxRowHeight = DEFAULT_MAX_ROW_HEIGHT,
}: UseGridMetricsOptions) {
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1200;
  });

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setContainerWidth(rect.width);
      }
    }
  }, [containerRef]);

  useEffect(() => {
    updateWidth();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    const handleWindowResize = () => updateWidth();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [containerRef, updateWidth]);

  const rowHeight = computeResponsiveRowHeight({
    containerWidth,
    cols,
    marginX: margin,
    minRowHeight,
    maxRowHeight,
  });

  return {
    containerWidth,
    rowHeight,
  };
}
