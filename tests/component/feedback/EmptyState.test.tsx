import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/ui/feedback/EmptyState';

describe('EmptyState', () => {
  it('рендерит заголовок и описание', () => {
    render(
      <EmptyState
        title="Нет виджетов"
        description="Добавьте виджет из каталога для начала работы"
      />,
    );

    expect(screen.getByText('Нет виджетов')).toBeInTheDocument();
    expect(screen.getByText('Добавьте виджет из каталога для начала работы')).toBeInTheDocument();
  });

  it('рендерит действие и обрабатывает клик', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();

    render(<EmptyState title="Пусто" action={{ label: 'Добавить', onClick: handleAction }} />);

    const btn = screen.getByRole('button', { name: 'Добавить' });
    expect(btn).toBeInTheDocument();

    await user.click(btn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
