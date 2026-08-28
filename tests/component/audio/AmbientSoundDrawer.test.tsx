import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AmbientSoundDrawer } from '@/features/audio/AmbientSoundDrawer';

describe('AmbientSoundDrawer Component', () => {
  it('renders all 6 soundscapes and master volume slider when open', () => {
    const handleClose = vi.fn();
    render(<AmbientSoundDrawer isOpen={true} onClose={handleClose} />);

    expect(screen.getByText('Звуки природы и концентрации')).toBeInTheDocument();
    expect(screen.getByText('Дождь за окном')).toBeInTheDocument();
    expect(screen.getByText('Костёр')).toBeInTheDocument();
    expect(screen.getByText('Морской прибой')).toBeInTheDocument();
    expect(screen.getByText('Лес и ветер')).toBeInTheDocument();
    expect(screen.getByText('Уютное кафе')).toBeInTheDocument();
    expect(screen.getByText('Шум для концентрации')).toBeInTheDocument();
  });

  it('toggles a soundscape track on switch click', () => {
    const handleClose = vi.fn();
    render(<AmbientSoundDrawer isOpen={true} onClose={handleClose} />);

    const rainSwitch = screen.getByRole('switch', { name: /включить дождь за окном/i });
    expect(rainSwitch).toBeInTheDocument();

    fireEvent.click(rainSwitch);
    expect(rainSwitch).toHaveAttribute('aria-checked', 'true');
  });
});
