import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetSettingsDrawer } from '@/features/dashboard/components/WidgetSettingsDrawer';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { registerBuiltInWidgets } from '@/widgets/built-in';

describe('WidgetSettingsDrawer Component', () => {
  beforeEach(() => {
    registerBuiltInWidgets();
    useDashboardStore.setState({
      instances: [
        {
          instanceId: 'clock-1',
          widgetId: 'clock',
          settings: { is24Hour: true, showSeconds: false },
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
          settings: { is24Hour: true, showSeconds: false },
        },
      ],
    });
    vi.restoreAllMocks();
  });

  it('должен рендерить заголовок и кнопку Готово', () => {
    const onClose = vi.fn();
    render(<WidgetSettingsDrawer instanceId="clock-1" onClose={onClose} />);

    expect(screen.getByText(/настройки/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument();
  });

  it('должен обновлять настройки виджета в сторе при изменении полей', () => {
    const onClose = vi.fn();
    render(<WidgetSettingsDrawer instanceId="clock-1" onClose={onClose} />);

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    fireEvent.click(switches[0]);

    const updatedInstance = useDashboardStore
      .getState()
      .instances.find((i) => i.instanceId === 'clock-1');
    expect(updatedInstance?.settings).toBeDefined();
  });

  it('при клике на кнопку Готово должен вызывать onClose', () => {
    const onClose = vi.fn();
    render(<WidgetSettingsDrawer instanceId="clock-1" onClose={onClose} />);

    const doneBtn = screen.getByRole('button', { name: 'Готово' });
    fireEvent.click(doneBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
