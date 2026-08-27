import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/ui/feedback/Spinner';

describe('Spinner', () => {
  it('рендерит индикатор с role="status" и доступным лейблом', () => {
    render(<Spinner label="Загрузка данных..." />);
    const spinner = screen.getByRole('status');

    expect(spinner).toBeInTheDocument();
    expect(screen.getByText('Загрузка данных...')).toBeInTheDocument();
  });

  it('поддерживает разные размеры', () => {
    const { rerender } = render(<Spinner size="sm" />);
    expect(screen.getByRole('status')).toHaveClass('w-4');

    rerender(<Spinner size="lg" />);
    expect(screen.getByRole('status')).toHaveClass('w-8');
  });
});
