import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RootErrorBoundary } from '@/ui/feedback/RootErrorBoundary';

// Компонент, который намеренно бросает ошибку при рендере
const CrashingComponent = () => {
  throw new Error('Test crash in child component');
};

const SafeComponent = () => <div>Safe Content</div>;

describe('RootErrorBoundary Component', () => {
  it('должен рендерить дочерний компонент при отсутствии ошибок', () => {
    render(
      <RootErrorBoundary>
        <SafeComponent />
      </RootErrorBoundary>,
    );

    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('должен перехватывать ошибку рендеринга и отображать UI восстановления', () => {
    // Отключаем вывод console.error в vitest для ожидаемого сбоя
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RootErrorBoundary>
        <CrashingComponent />
      </RootErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
    expect(screen.getByText('Test crash in child component')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Перезагрузить страницу/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Сбросить макет на стандартный/i }),
    ).toBeInTheDocument();

    spy.mockRestore();
  });

  it('должен поддерживать кастомный fallback', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RootErrorBoundary fallback={<div>Custom Error Screen</div>}>
        <CrashingComponent />
      </RootErrorBoundary>,
    );

    expect(screen.getByText('Custom Error Screen')).toBeInTheDocument();
    expect(screen.queryByText('Что-то пошло не так')).not.toBeInTheDocument();

    spy.mockRestore();
  });
});
