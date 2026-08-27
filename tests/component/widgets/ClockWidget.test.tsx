import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ClockWidget } from '@/widgets/built-in/ClockWidget/ClockWidget';
import { clockManifest } from '@/widgets/built-in/ClockWidget/manifest';
import { useI18nStore } from '@/core/i18n';

describe('ClockWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 27, 14, 30, 45)); // 27 августа 2026 14:30:45
    useI18nStore.getState().setLanguage('ru');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('манифест должен быть строго типизирован и содержать surface=chromeless', () => {
    expect(clockManifest.id).toBe('clock');
    expect(clockManifest.surface).toBe('chromeless');
    expect(clockManifest.nameKey).toBe('widgets.clock');
    expect(clockManifest.size.defaultW).toBe(4);
  });

  it('должен отображать время в 24-часовом формате с секундами по умолчанию', () => {
    render(
      <ClockWidget
        instanceId="clock-1"
        settings={{ is24Hour: true, showSeconds: true, showDate: true }}
      />,
    );

    expect(screen.getByText('14:30:45')).toBeInTheDocument();
  });

  it('должен скрывать секунды при showSeconds=false', () => {
    render(
      <ClockWidget
        instanceId="clock-1"
        settings={{ is24Hour: true, showSeconds: false, showDate: true }}
      />,
    );

    expect(screen.getByText('14:30')).toBeInTheDocument();
  });

  it('должен обновлять время каждую секунду', () => {
    render(
      <ClockWidget
        instanceId="clock-1"
        settings={{ is24Hour: true, showSeconds: true, showDate: true }}
      />,
    );

    expect(screen.getByText('14:30:45')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('14:30:46')).toBeInTheDocument();
  });
});
