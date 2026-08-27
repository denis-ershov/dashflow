import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/ui/overlays/Modal';

describe('Modal', () => {
  it('не рендерится когда isOpen = false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Контент модалки</div>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Контент модалки')).not.toBeInTheDocument();
  });

  it('рендерится с заголовком и контентом когда isOpen = true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Настройки">
        <div>Контент модалки</div>
      </Modal>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Настройки')).toBeInTheDocument();
    expect(screen.getByText('Контент модалки')).toBeInTheDocument();
  });

  it('закрывается по клику на кнопку закрытия и на backdrop', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Окно">
        <div>Тело</div>
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    const backdrop = document.querySelector('[data-backdrop="true"]');
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      await user.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(2);
    }
  });

  it('закрывается по нажатию Escape', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Окно">
        <button type="button">Фокус внутри</button>
      </Modal>,
    );

    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('возвращает фокус на элемент, открывший модалку, после закрытия', async () => {
    const user = userEvent.setup();
    const TestHost: React.FC = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button type="button" id="trigger-btn" onClick={() => setIsOpen(true)}>
            Открыть
          </button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Тест">
            <button type="button">Внутри</button>
          </Modal>
        </div>
      );
    };

    render(<TestHost />);
    const trigger = screen.getByRole('button', { name: 'Открыть' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
