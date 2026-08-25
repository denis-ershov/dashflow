import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('тестовое окружение', () => {
  it('умеет монтировать React-дерево в DOM', () => {
    render(<button type="button">Готово</button>);
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument();
  });

  it('предоставляет document для модулей, работающих с head', () => {
    const tag = document.createElement('style');
    tag.id = 'dashflow-probe';
    document.head.appendChild(tag);
    expect(document.getElementById('dashflow-probe')).not.toBeNull();
  });
});
