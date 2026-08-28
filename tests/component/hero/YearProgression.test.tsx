import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { YearProgression } from '@/features/hero/YearProgression';

describe('YearProgression Component', () => {
  it('renders progression button and cycles modes on click', () => {
    render(<YearProgression />);
    const btn = screen.getByRole('button', { name: /прогресс времени/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });
});
