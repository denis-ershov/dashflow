import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SearchBar2 } from '@/features/hero/SearchBar2';

describe('SearchBar2 Component', () => {
  it('renders input with default placeholder and search button', () => {
    render(<SearchBar2 defaultEngine="google" />);
    const input = screen.getByRole('textbox', { name: /строка поиска/i });
    expect(input).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /искать/i })).toBeInTheDocument();
  });

  it('toggles engine selector dropdown', () => {
    const handleEngineChange = vi.fn();
    render(<SearchBar2 defaultEngine="google" onEngineChange={handleEngineChange} />);

    const selectBtn = screen.getByRole('button', { name: /выбрать поисковую систему/i });
    fireEvent.click(selectBtn);

    expect(screen.getByText('Яндекс')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Perplexity AI')).toBeInTheDocument();

    fireEvent.click(screen.getByText('GitHub'));
    expect(handleEngineChange).toHaveBeenCalledWith('github');
  });
});
