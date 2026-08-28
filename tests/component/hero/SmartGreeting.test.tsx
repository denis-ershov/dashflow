import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SmartGreeting } from '@/features/hero/SmartGreeting';

describe('SmartGreeting Component', () => {
  it('renders time-based greeting heading', () => {
    render(<SmartGreeting userName="Денис" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('Денис');
  });
});
