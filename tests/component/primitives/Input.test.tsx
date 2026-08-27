import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/ui/primitives/Input';

describe('Input', () => {
  it('рендерит поле ввода с placeholder', () => {
    render(<Input placeholder="Введите имя" />);
    expect(screen.getByPlaceholderText('Введите имя')).toBeInTheDocument();
  });

  it('позволяет вводить текст', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Поиск" />);
    const input = screen.getByPlaceholderText('Поиск');

    await user.type(input, 'Привет');
    expect(input).toHaveValue('Привет');
  });

  it('отображает ошибку и устанавливает aria-invalid', () => {
    render(<Input placeholder="Email" error="Неверный формат" />);
    const input = screen.getByPlaceholderText('Email');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Неверный формат')).toBeInTheDocument();
    expect(screen.getByText('Неверный формат')).toHaveClass('text-danger');
  });

  it('имеет минимальную высоту 44px', () => {
    render(<Input placeholder="Test" />);
    expect(screen.getByPlaceholderText('Test')).toHaveClass('min-h-[44px]');
  });
});
