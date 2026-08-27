import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/ui/primitives/Button';

describe('Button', () => {
  it('рендерит кнопку с переданным текстом', () => {
    render(<Button>Нажать</Button>);
    expect(screen.getByRole('button', { name: 'Нажать' })).toBeInTheDocument();
  });

  it('обрабатывает клики', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Клик</Button>);

    await user.click(screen.getByRole('button', { name: 'Клик' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('не вызывает клик в disabled состоянии', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Отключена</Button>);

    const btn = screen.getByRole('button', { name: 'Отключена' });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('поддерживает разные варианты стилей без сторонних цветов', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-fg');
  });

  it('имеет минимальную высоту не менее 44px (правило 16)', () => {
    render(<Button size="sm">Маленькая</Button>);
    expect(screen.getByRole('button')).toHaveClass('min-h-[44px]');
  });
});
