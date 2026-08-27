import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown, type DropdownItem } from '@/ui/overlays/Dropdown';

describe('Dropdown', () => {
  const items: DropdownItem[] = [
    { id: '1', label: 'Настройки', onClick: vi.fn() },
    { id: '2', label: 'Удалить', danger: true, onClick: vi.fn() },
  ];

  it('открывает меню по клику на триггер и закрывает при повторном клике', async () => {
    const user = userEvent.setup();
    render(
      <Dropdown
        trigger={<button type="button">Опции</button>}
        items={items}
      />
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Опции' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Настройки')).toBeInTheDocument();
    expect(screen.getByText('Удалить')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Опции' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('вызывает onClick пункта меню и закрывает меню', async () => {
    const user = userEvent.setup();
    const handleSettings = vi.fn();
    const testItems: DropdownItem[] = [
      { id: 's', label: 'Параметры', onClick: handleSettings },
    ];

    render(
      <Dropdown
        trigger={<button type="button">Меню</button>}
        items={testItems}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Меню' }));
    await user.click(screen.getByText('Параметры'));

    expect(handleSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('закрывается по нажатию Escape', async () => {
    const user = userEvent.setup();
    render(
      <Dropdown
        trigger={<button type="button">Открыть меню</button>}
        items={items}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
