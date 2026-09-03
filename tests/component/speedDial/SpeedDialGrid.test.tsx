import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SpeedDialGrid } from '@/features/speedDial/SpeedDialGrid';

describe('SpeedDialGrid Component', () => {
  const links = [
    { id: '1', title: 'Google', url: 'https://google.com' },
    { id: '2', title: 'GitHub', url: 'https://github.com' },
  ];

  it('renders all links and add button', () => {
    const handleAdd = vi.fn();
    const handleRemove = vi.fn();

    render(<SpeedDialGrid links={links} onAddClick={handleAdd} onRemoveLink={handleRemove} />);

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /добавить быструю ссылку/i });
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalled();
  });
});
