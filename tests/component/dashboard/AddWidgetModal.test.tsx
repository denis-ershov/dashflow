import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddWidgetModal } from '@/features/dashboard/components/AddWidgetModal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useI18nStore } from '@/core/i18n/i18nStore';
import { registerBuiltInWidgets } from '@/widgets/built-in';

describe('AddWidgetModal Component', () => {
  beforeEach(() => {
    registerBuiltInWidgets();
    useI18nStore.setState({ language: 'ru' });
    useDashboardStore.setState({
      activeModal: 'addWidget',
      instances: [],
      widgets: [],
    });
    vi.restoreAllMocks();
  });

  it('должен рендерить список всех доступных 12 виджетов из реестра', () => {
    render(<AddWidgetModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /добавить/i }).length).toBeGreaterThanOrEqual(12);
  });

  it('должен фильтровать виджеты по поисковому запросу', () => {
    render(<AddWidgetModal />);

    const searchInput = screen.getByRole('textbox', { name: /поиск виджетов/i });
    fireEvent.change(searchInput, { target: { value: 'погода' } });

    expect(screen.getByText(/погода/i)).toBeInTheDocument();
    expect(screen.queryByText(/цифровые часы/i)).not.toBeInTheDocument();
  });

  it('должен добавлять выбранный виджет в стор и закрывать модальное окно', () => {
    render(<AddWidgetModal />);

    const addButtons = screen.getAllByRole('button', { name: /добавить/i });
    fireEvent.click(addButtons[0]);

    expect(useDashboardStore.getState().instances.length).toBe(1);
    expect(useDashboardStore.getState().activeModal).toBeNull();
  });
});
