import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HeroClock } from '@/features/hero/HeroClock';

describe('HeroClock Component', () => {
  it('renders timer element with accessible label', () => {
    render(<HeroClock style="digital" />);
    const timer = screen.getByRole('timer');
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveAttribute('aria-label');
  });

  it('supports multiple styles (minimal, serif, flip, mono)', () => {
    const { rerender } = render(<HeroClock style="minimal" />);
    expect(screen.getByRole('timer')).toBeInTheDocument();

    rerender(<HeroClock style="serif" />);
    expect(screen.getByRole('timer')).toBeInTheDocument();

    rerender(<HeroClock style="flip" />);
    expect(screen.getByRole('timer')).toBeInTheDocument();

    rerender(<HeroClock style="mono" />);
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });
});
