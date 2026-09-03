import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YearProgressWidget } from '@/widgets/built-in/YearProgressWidget/YearProgressWidget';
import { yearProgressManifest } from '@/widgets/built-in/YearProgressWidget/manifest';

describe('YearProgressWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('манифест должен содержать правильные метаданные', () => {
    expect(yearProgressManifest.id).toBe('yearProgress');
    expect(yearProgressManifest.category).toBe('hero');
    expect(yearProgressManifest.surface).toBe('chromeless');
    expect(yearProgressManifest.nameKey).toBe('widgets.yearProgress');
  });

  it('должен рендерить кнопку с процентом прогресса', () => {
    render(
      <YearProgressWidget
        instanceId="yp-1"
        settings={{ defaultMode: 'year', showPercentage: true }}
      />,
    );

    expect(screen.getByRole('button', { name: /прогресс времени/i })).toBeInTheDocument();
  });

  it('должен переключать режим при клике', () => {
    const handleUpdate = vi.fn();
    render(
      <YearProgressWidget
        instanceId="yp-1"
        settings={{ defaultMode: 'year' }}
        onUpdateSettings={handleUpdate}
      />,
    );

    const btn = screen.getByRole('button', { name: /прогресс времени/i });
    fireEvent.click(btn);

    expect(handleUpdate).toHaveBeenCalledWith({ defaultMode: 'month' });
  });
});
