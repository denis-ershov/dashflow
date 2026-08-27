import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceModal } from '@/features/appearance/AppearanceModal';
import { useThemeStore } from '@/core/theme/themeStore';

describe('AppearanceModal', () => {
  beforeEach(() => {
    useThemeStore.getState().resetTheme();
  });

  it('рендерит модальное окно внешнего вида с вкладками', () => {
    render(<AppearanceModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Внешний вид & Темы')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Темы' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обои' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSS' })).toBeInTheDocument();
  });

  it('переключает вкладки по клику', async () => {
    const user = userEvent.setup();
    render(<AppearanceModal isOpen={true} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Обои' }));
    expect(screen.getByText('Затемнение обоев')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'CSS' }));
    expect(screen.getByPlaceholderText(/Пример:/i)).toBeInTheDocument();
  });

  it('вызывает onClose при клике на закрытие', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<AppearanceModal isOpen={true} onClose={handleClose} />);

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(handleClose).toHaveBeenCalled();
  });
});
