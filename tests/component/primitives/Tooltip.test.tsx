import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from '@/ui/primitives/Tooltip';

describe('Tooltip', () => {
  it('показывает подсказку при наведении мыши и скрывает при уходе', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Текст подсказки">
        <button type="button">Наведи</button>
      </Tooltip>
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Наведи' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Текст подсказки')).toBeInTheDocument();

    await user.unhover(screen.getByRole('button', { name: 'Наведи' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('показывает подсказку при фокусе с клавиатуры', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Клавиатурная подсказка">
        <button type="button">Фокус</button>
      </Tooltip>
    );

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Клавиатурная подсказка')).toBeInTheDocument();
  });
});
