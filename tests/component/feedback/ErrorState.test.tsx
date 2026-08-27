import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '@/ui/feedback/ErrorState';

describe('ErrorState', () => {
  it('рендерит сообщение об ошибке с role="alert"', () => {
    render(
      <ErrorState
        title="Ошибка загрузки"
        message="Не удалось получить данные с сервера"
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
    expect(screen.getByText('Не удалось получить данные с сервера')).toBeInTheDocument();
  });

  it('рендерит кнопку повтора и вызывает onRetry', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(
      <ErrorState
        title="Сбой"
        onRetry={handleRetry}
        retryLabel="Повторить попытку"
      />
    );

    const btn = screen.getByRole('button', { name: 'Повторить попытку' });
    expect(btn).toBeInTheDocument();

    await user.click(btn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
