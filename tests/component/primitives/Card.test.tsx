import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Card } from '@/ui/primitives/Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(<Card><div>Card Content</div></Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('handles interactive click events', () => {
    const handleClick = vi.fn();
    render(<Card interactive onClick={handleClick}>Clickable Card</Card>);
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies glass variant classes by default', () => {
    const { container } = render(<Card>Glass Card</Card>);
    expect(container.firstChild).toHaveClass('glass-card');
  });
});
