import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GridEngine } from '@/features/dashboard/components/GridEngine';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { registerBuiltInWidgets } from '@/widgets/built-in';

describe('GridEngine Component', () => {
  beforeEach(() => {
    registerBuiltInWidgets();
    const instances = [
      {
        instanceId: 'clock-1',
        widgetId: 'clock',
        settings: { is24Hour: true },
      },
      {
        instanceId: 'quotes-1',
        widgetId: 'quotes',
        settings: {},
      },
    ];
    const layouts = {
      xl: [
        { i: 'clock-1', x: 0, y: 0, w: 4, h: 2 },
        { i: 'quotes-1', x: 4, y: 0, w: 6, h: 2 },
      ],
      lg: [
        { i: 'clock-1', x: 0, y: 0, w: 4, h: 2 },
        { i: 'quotes-1', x: 4, y: 0, w: 4, h: 2 },
      ],
      md: [
        { i: 'clock-1', x: 0, y: 0, w: 6, h: 2 },
        { i: 'quotes-1', x: 0, y: 2, w: 6, h: 2 },
      ],
      sm: [
        { i: 'clock-1', x: 0, y: 0, w: 4, h: 2 },
        { i: 'quotes-1', x: 0, y: 2, w: 4, h: 2 },
      ],
      xs: [
        { i: 'clock-1', x: 0, y: 0, w: 2, h: 2 },
        { i: 'quotes-1', x: 0, y: 2, w: 2, h: 2 },
      ],
    };

    useDashboardStore.setState({
      columns: 12,
      baseColumns: 12,
      gap: 16,
      isEditMode: false,
      activeModal: null,
      instances,
      layouts,
      widgets: [
        {
          instanceId: 'clock-1',
          widgetId: 'clock',
          x: 0,
          y: 0,
          w: 4,
          h: 2,
          settings: { is24Hour: true },
        },
        { instanceId: 'quotes-1', widgetId: 'quotes', x: 4, y: 0, w: 6, h: 2, settings: {} },
      ],
    });
    vi.restoreAllMocks();
  });

  it('должен рендерить виджеты дашборда в оболочке WidgetShell с ленивой загрузкой', async () => {
    render(<GridEngine />);

    await waitFor(() => {
      expect(screen.getByTestId('grid-engine-container')).toBeInTheDocument();
    });

    const clockShell = document.querySelector('[data-instance-id="clock-1"]');
    const quotesShell = document.querySelector('[data-instance-id="quotes-1"]');

    expect(clockShell).toBeInTheDocument();
    expect(quotesShell).toBeInTheDocument();
  });

  it('должен отображать EmptyState при отсутствии виджетов на дашборде', () => {
    useDashboardStore.setState({
      instances: [],
      widgets: [],
      layouts: { xl: [], lg: [], md: [], sm: [], xs: [] },
    });

    render(<GridEngine />);

    expect(screen.getByText(/ваш дашборд пока пуст/i)).toBeInTheDocument();
    const addBtn = screen.getByRole('button', { name: /добавить первый виджет/i });
    expect(addBtn).toBeInTheDocument();

    fireEvent.click(addBtn);
    expect(useDashboardStore.getState().activeModal).toBe('addWidget');
  });

  it('в режиме правки должен позволять удалять виджеты', () => {
    useDashboardStore.setState({ isEditMode: true });

    render(<GridEngine />);

    const removeButtons = screen.getAllByRole('button', { name: /удалить виджет/i });
    expect(removeButtons.length).toBe(2);

    fireEvent.click(removeButtons[0]);
    expect(useDashboardStore.getState().instances.length).toBe(1);
    expect(useDashboardStore.getState().widgets.length).toBe(1);
  });
});
