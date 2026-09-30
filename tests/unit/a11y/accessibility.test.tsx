import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagnosticsSection } from '@/features/settings/components/DiagnosticsSection';
import { Modal } from '@/ui/overlays/Modal';
import { Button } from '@/ui/primitives/Button';

describe('Accessibility & Standards (a11y)', () => {
  it('модальное окно Modal должно иметь role="dialog", aria-modal="true" и доступный заголовок', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Параметры безопасности">
        <p>Содержимое диалога</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: /закрыть/i })).toBeInTheDocument();
  });

  it('кнопка Button должна поддерживать keyboard focus и aria-busy при загрузке', () => {
    const { rerender } = render(<Button aria-label="Сохранить изменения">Сохранить</Button>);
    const btn = screen.getByRole('button', { name: /сохранить/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('type', 'button');

    rerender(
      <Button aria-label="Сохранить изменения" loading={true}>
        Сохранить
      </Button>,
    );
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
  });

  it('секция диагностики DiagnosticsSection должна содержать доступные переключатели Switch', () => {
    render(<DiagnosticsSection />);

    // Проверяем наличие чекбоксов / переключателей
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    // Кнопка копирования должна быть доступна по роли
    expect(screen.getByRole('button', { name: /скопировать отчёт/i })).toBeInTheDocument();
  });
});
