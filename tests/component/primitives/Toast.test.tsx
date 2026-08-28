import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ToastContainer, toast, useToastStore } from '@/ui/primitives/Toast';

describe('Toast System', () => {
  it('renders toasts and dismisses them', () => {
    render(<ToastContainer />);

    act(() => {
      toast.success('Настройки сохранены', 'Успех');
    });

    expect(screen.getByText('Успех')).toBeInTheDocument();
    expect(screen.getByText('Настройки сохранены')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /закрыть уведомление/i });
    fireEvent.click(closeBtn);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
