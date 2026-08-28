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
