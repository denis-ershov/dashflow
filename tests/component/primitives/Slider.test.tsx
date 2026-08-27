import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from '@/ui/primitives/Slider';

describe('Slider', () => {
  it('рендерит ползунок с лейблом и значением', () => {
    render(<Slider value={30} min={0} max={100} onChange={() => {}} label="Прозрачность" unit="%" />);

    expect(screen.getByText('Прозрачность')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveValue('30');
  });

  it('вызывает onChange при изменении значения', () => {
    const handleChange = vi.fn();
    render(<Slider value={20} min={0} max={100} onChange={handleChange} label="Громкость" />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '35' } });
    expect(handleChange).toHaveBeenCalledWith(35);
  });
});
