import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FloatingDock } from '@/features/dock/FloatingDock';

describe('FloatingDock Component', () => {
  it('renders all action buttons and triggers callbacks', () => {
    const handleToggleLayout = vi.fn();
    const handleOpenAddWidget = vi.fn();
    const handleOpenAppearance = vi.fn();
    const handleOpenAudio = vi.fn();
    const handleOpenSettings = vi.fn();
    const handleOpenCommandPalette = vi.fn();

    render(
      <FloatingDock
        layoutMode="modular"
        onToggleLayoutMode={handleToggleLayout}
        onOpenAddWidget={handleOpenAddWidget}
        onOpenAppearance={handleOpenAppearance}
        onOpenAudio={handleOpenAudio}
        onOpenSettings={handleOpenSettings}
        onOpenCommandPalette={handleOpenCommandPalette}
      />,
    );

    const modeBtn = screen.getByRole('button', { name: /режим zen/i });
    fireEvent.click(modeBtn);
    expect(handleToggleLayout).toHaveBeenCalled();

    const addBtn = screen.getByRole('button', { name: /добавить виджет/i });
    fireEvent.click(addBtn);
    expect(handleOpenAddWidget).toHaveBeenCalled();
  });
});

describe('FloatingDock: состояния кнопок', () => {
  const baseProps = {
    layoutMode: 'modular' as const,
    onToggleLayoutMode: vi.fn(),
    onOpenAddWidget: vi.fn(),
    onOpenAppearance: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onToggleEditMode: vi.fn(),
  };

  it('подсвечивает кнопку открытой панели', () => {
    render(<FloatingDock {...baseProps} activePanel="appearance" />);
    expect(screen.getByRole('button', { name: 'Темы и обои' }).className).toContain('text-primary');
    expect(screen.getByRole('button', { name: 'Настройки' }).className).not.toContain(
      'text-primary',
    );
  });

  it('переключатели сообщают состояние через aria-pressed', () => {
    render(<FloatingDock {...baseProps} layoutMode="canvas" isEditMode />);
    expect(screen.getByRole('button', { name: 'Завершить редактирование' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Режим Zen' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('без onOpenAudio кнопки звуков нет', () => {
    render(<FloatingDock {...baseProps} />);
    expect(screen.queryByRole('button', { name: 'Звуки природы' })).not.toBeInTheDocument();
  });
});
