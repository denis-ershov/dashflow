import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Select } from '@/ui/primitives/Select';

describe('Select Component', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
  ];

  it('renders select with options and label', () => {
    render(<Select label="Test Select" options={options} defaultValue="opt1" />);
    expect(screen.getByText('Test Select')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const handleChange = vi.fn();
    render(<Select options={options} onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'opt2' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays error message and sets aria-invalid', () => {
    render(<Select label="Error Select" options={options} error="Field required" />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Field required')).toBeInTheDocument();
  });
});
