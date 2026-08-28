import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '@/features/settings/components/SettingsModal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAppStore } from '@/stores/useAppStore';

describe('SettingsModal Component', () => {
  beforeEach(() => {
    useDashboardStore.setState({ activeModal: 'settings', columns: 12, gap: 16 });
    useAppStore.setState({ language: 'ru', animationsEnabled: true });
  });

  it('должен рендерить основные элементы настроек при activeModal=settings', () => {
    render(<SettingsModal />);
    expect(screen.getByText('Основные')).toBeInTheDocument();
    expect(screen.getByText('Язык интерфейса')).toBeInTheDocument();
    expect(screen.getByText('Сетка и расположение')).toBeInTheDocument();
  });

  it('должен переключать язык при клике на кнопки языка', () => {
    render(<SettingsModal />);
    const enButton = screen.getByText('English');
    fireEvent.click(enButton);
    expect(useAppStore.getState().language).toBe('en');
  });

  it('должен изменять количество колонок при клике на выбор сетки', () => {
    render(<SettingsModal />);
    const col16Button = screen.getByText('16 Колонок');
    fireEvent.click(col16Button);
    expect(useDashboardStore.getState().columns).toBe(16);
  });
});
