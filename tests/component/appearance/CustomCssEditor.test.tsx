import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomCssEditor } from '@/features/appearance/CustomCssEditor';
import { useThemeStore } from '@/core/theme/themeStore';

describe('CustomCssEditor', () => {
  beforeEach(() => {
    useThemeStore.getState().resetTheme();
  });

  it('рендерит поле ввода и кнопки сохранения', () => {
    render(<CustomCssEditor />);

    expect(screen.getByPlaceholderText(/Пример:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сохранить/i })).toBeInTheDocument();
  });

  it('сохраняет валидный CSS в store', async () => {
    const user = userEvent.setup();
    render(<CustomCssEditor />);

    const textarea = screen.getByPlaceholderText(/Пример:/i);
    fireEvent.change(textarea, { target: { value: '.my-card { opacity: 0.8; }' } });

    const saveBtn = screen.getByRole('button', { name: /Сохранить/i });
    await user.click(saveBtn);

    expect(useThemeStore.getState().customCss).toBe('.my-card { opacity: 0.8; }');
  });

  it('показывает ошибку при вводе запрещенного CSS', async () => {
    const user = userEvent.setup();
    render(<CustomCssEditor />);

    const textarea = screen.getByPlaceholderText(/Пример:/i);
    fireEvent.change(textarea, { target: { value: '@import url("https://bad.com/x.css");' } });

    const saveBtn = screen.getByRole('button', { name: /Сохранить/i });
    await user.click(saveBtn);

    expect(screen.getByText(/Правило @import запрещено/i)).toBeInTheDocument();
    expect(useThemeStore.getState().customCss).toBe('');
  });
});
