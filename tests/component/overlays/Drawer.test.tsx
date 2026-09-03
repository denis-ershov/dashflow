import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from '@/ui/overlays/Drawer';

describe('Drawer', () => {
  it('не рендерится при isOpen = false', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} title="Панель">
        <div>Контент панели</div>
      </Drawer>,
    );

    expect(screen.queryByText('Контент панели')).not.toBeInTheDocument();
  });

  it('рендерится с заголовком и подзаголовком при isOpen = true', () => {
    render(
      <Drawer isOpen={true} onClose={() => {}} title="Каталог" subtitle="Доступные виджеты">
        <div>Контент панели</div>
      </Drawer>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Каталог')).toBeInTheDocument();
    expect(screen.getByText('Доступные виджеты')).toBeInTheDocument();
    expect(screen.getByText('Контент панели')).toBeInTheDocument();
  });

  it('закрывается по клику на кнопку закрытия и по Escape', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Боковая панель">
        <div>Тело</div>
      </Drawer>,
    );

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
