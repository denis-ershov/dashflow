import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '@/ui/primitives/Switch';

describe('Switch', () => {
  it('рендерит переключатель с ролью switch и aria-checked', () => {
    render(<Switch checked={true} onChange={() => {}} label="Тёмная тема" />);
    const switchEl = screen.getByRole('switch', { name: 'Тёмная тема' });

    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('вызывает onChange при клике и переключении с клавиатуры', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch checked={false} onChange={handleChange} label="Включить" />);

    const switchEl = screen.getByRole('switch', { name: 'Включить' });
    await user.click(switchEl);
    expect(handleChange).toHaveBeenCalledWith(true);

    switchEl.focus();
    await user.keyboard(' ');
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('не срабатывает в disabled состоянии', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch checked={false} disabled onChange={handleChange} label="Заблокировано" />);

    const switchEl = screen.getByRole('switch', { name: 'Заблокировано' });
    expect(switchEl).toBeDisabled();
    await user.click(switchEl);
    expect(handleChange).not.toHaveBeenCalled();
  });
});
