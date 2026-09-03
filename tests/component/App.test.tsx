import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '@/entrypoints/newtab/App';
import { useAppStore } from '@/stores/useAppStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { registerBuiltInWidgets } from '@/widgets/built-in';

describe('App Root Layout', () => {
  beforeEach(() => {
    registerBuiltInWidgets();
    useAppStore.setState({ isInitialized: true });
    useDashboardStore.setState({
      layoutMode: 'modular',
      instances: [
        {
          instanceId: 'clock-1',
          widgetId: 'clock',
          settings: {},
        },
      ],
      widgets: [
        {
          instanceId: 'clock-1',
          widgetId: 'clock',
          x: 0,
          y: 0,
          w: 4,
          h: 2,
          settings: {},
        },
      ],
      layouts: {
        xl: [{ i: 'clock-1', x: 0, y: 0, w: 4, h: 2 }],
        lg: [{ i: 'clock-1', x: 0, y: 0, w: 4, h: 2 }],
        md: [{ i: 'clock-1', x: 0, y: 0, w: 6, h: 2 }],
        sm: [{ i: 'clock-1', x: 0, y: 0, w: 4, h: 2 }],
        xs: [{ i: 'clock-1', x: 0, y: 0, w: 2, h: 2 }],
      },
    });
    vi.restoreAllMocks();
  });

  it('должен рендерить Hero-зону, плавающий Dock и сетку дашборда при успешной инициализации', async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole('navigation', { name: /панель быстрого управления/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('timer')).toBeInTheDocument();
      expect(screen.getByTestId('grid-engine-container')).toBeInTheDocument();
    });
  });

  it('должен показывать индикатор загрузки, пока приложение не инициализировано', () => {
    useAppStore.setState({ isInitialized: false, initialize: vi.fn() });

    render(<App />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
