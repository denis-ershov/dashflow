import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GreetingWidget } from '@/widgets/built-in/GreetingWidget/GreetingWidget';
import { greetingManifest } from '@/widgets/built-in/GreetingWidget/manifest';

describe('GreetingWidget Component & Manifest', () => {
  it('манифест должен содержать правильные метаданные', () => {
    expect(greetingManifest.id).toBe('greeting');
    expect(greetingManifest.category).toBe('hero');
    expect(greetingManifest.surface).toBe('chromeless');
    expect(greetingManifest.nameKey).toBe('widgets.greeting');
  });

  it('должен отображать приветствие и имя пользователя', () => {
    render(<GreetingWidget instanceId="greeting-1" settings={{ userName: 'Алексей', showIcon: true }} />);

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText(/Алексей/)).toBeInTheDocument();
  });
});
