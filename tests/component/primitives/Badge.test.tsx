import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/ui/primitives/Badge';

describe('Badge', () => {
  it('рендерит бейдж с текстом', () => {
    render(<Badge>Новинка</Badge>);
    expect(screen.getByText('Новинка')).toBeInTheDocument();
  });

  it('поддерживает варианты без сторонних цветов', () => {
    const { rerender } = render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText('Primary')).toHaveClass('text-primary');

    rerender(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('text-success');

    rerender(<Badge variant="danger">Danger</Badge>);
    expect(screen.getByText('Danger')).toHaveClass('text-danger');
  });
});
