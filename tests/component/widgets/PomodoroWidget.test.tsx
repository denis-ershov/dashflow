import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PomodoroWidget } from '@/widgets/built-in/PomodoroWidget/PomodoroWidget';
import { pomodoroManifest } from '@/widgets/built-in/PomodoroWidget/manifest';

describe('PomodoroWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('манифест должен быть строго типизирован и содержать surface=panel', () => {
    expect(pomodoroManifest.id).toBe('pomodoro');
    expect(pomodoroManifest.surface).toBe('panel');
    expect(pomodoroManifest.nameKey).toBe('widgets.pomodoro');
  });

  it('должен рендерить начальное время 25:00 по умолчанию', () => {
    render(<PomodoroWidget instanceId="pomo-1" settings={{ workTime: 25, breakTime: 5 }} />);

    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText(/фокус/i)).toBeInTheDocument();
  });

  it('должен запускать таймер и отсчитывать секунды', () => {
    render(<PomodoroWidget instanceId="pomo-1" settings={{ workTime: 25, breakTime: 5 }} />);

    const playBtn = screen.getByRole('button', { name: /старт|запустить/i });
    fireEvent.click(playBtn);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('24:58')).toBeInTheDocument();
  });

  it('должен сбрасывать таймер по кнопке сброса', () => {
    render(<PomodoroWidget instanceId="pomo-1" settings={{ workTime: 25, breakTime: 5 }} />);

    const playBtn = screen.getByRole('button', { name: /старт|запустить/i });
    fireEvent.click(playBtn);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('24:55')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /сброс/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('25:00')).toBeInTheDocument();
  });
});
