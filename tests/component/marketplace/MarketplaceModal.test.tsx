import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarketplaceModal } from '@/features/marketplace/components/MarketplaceModal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { registerBuiltInWidgets } from '@/widgets/built-in';
import { usePluginStore } from '@/core/plugins/pluginStore';
import { useI18nStore } from '@/core/i18n';

describe('MarketplaceModal Component', () => {
  beforeEach(() => {
    registerBuiltInWidgets();
    useI18nStore.setState({ language: 'ru' });
    usePluginStore.setState({ plugins: [] });
    useDashboardStore.setState({
      activeModal: 'marketplace',
      widgets: [],
      instances: [],
    });
    vi.restoreAllMocks();
  });

  it('должен рендерить список виджетов из реестра и переключать категории', () => {
    render(<MarketplaceModal />);

    expect(screen.getByText('Каталог Виджетов & Плагинов DashFlow')).toBeInTheDocument();
    expect(screen.getByText('Часы')).toBeInTheDocument();
    expect(screen.getByText('Погода')).toBeInTheDocument();

    // Переключение на категорию "Новости"
    const newsCat = screen.getByRole('button', { name: 'Новости' });
    fireEvent.click(newsCat);

    expect(screen.getByText('RSS Лента')).toBeInTheDocument();
  });

  it('должен открывать вкладку импорта JSON и валидировать манифест', async () => {
    render(<MarketplaceModal />);

    const importTab = screen.getByRole('button', { name: /\+ Импорт JSON/i });
    fireEvent.click(importTab);

    expect(screen.getByText(/Декларативные плагины DashFlow/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/feedUrl/i);
    fireEvent.change(textarea, { target: { value: '{"bad": "json"' } });

    const submitBtn = screen.getByRole('button', { name: /Проверить и Установить/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Синтаксическая ошибка/i)).toBeInTheDocument();
    });
  });
});
