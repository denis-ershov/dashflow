import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavRail } from '@/features/navigation/NavRail';
import { useDashboardStore } from '@/stores/useDashboardStore';

describe('NavRail Component', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      isEditMode: false,
      activeModal: null,
      isCommandPaletteOpen: false,
    });
    vi.restoreAllMocks();
  });

  it('должен рендерить основные кнопки навигации для десктопа и мобильной панели', () => {
    render(<NavRail />);

    expect(screen.getAllByRole('button', { name: /добавить виджет/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /поиск/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /темы|оформление/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /каталог|магазин/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /редактировать|настроить сетку/i })).toHaveLength(
      2,
    );
    expect(screen.getAllByRole('button', { name: /настройки/i })).toHaveLength(2);
  });

  it('должен переключать режим редактирования при клике на кнопку Edit', () => {
    render(<NavRail />);

    const [editBtn] = screen.getAllByRole('button', { name: /редактировать|настроить сетку/i });
    fireEvent.click(editBtn);

    expect(useDashboardStore.getState().isEditMode).toBe(true);

    fireEvent.click(editBtn);
    expect(useDashboardStore.getState().isEditMode).toBe(false);
  });

  it('должен открывать модальные окна при нажатии соответствующих кнопок', () => {
    render(<NavRail />);

    const [addBtn] = screen.getAllByRole('button', { name: /добавить виджет/i });
    fireEvent.click(addBtn);
    expect(useDashboardStore.getState().activeModal).toBe('addWidget');

    const [themesBtn] = screen.getAllByRole('button', { name: /темы|оформление/i });
    fireEvent.click(themesBtn);
    expect(useDashboardStore.getState().activeModal).toBe('themes');

    const [settingsBtn] = screen.getAllByRole('button', { name: /настройки/i });
    fireEvent.click(settingsBtn);
    expect(useDashboardStore.getState().activeModal).toBe('settings');
  });

  it('должен открывать командную палитру при клике на кнопку Поиск', () => {
    render(<NavRail />);

    const [searchBtn] = screen.getAllByRole('button', { name: /поиск/i });
    fireEvent.click(searchBtn);

    expect(useDashboardStore.getState().isCommandPaletteOpen).toBe(true);
  });
});
