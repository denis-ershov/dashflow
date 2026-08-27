import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchWidget } from '@/widgets/built-in/SearchWidget/SearchWidget';
import { searchManifest } from '@/widgets/built-in/SearchWidget/manifest';

describe('SearchWidget Component & Manifest', () => {
  it('манифест должен быть строго типизирован и содержать surface=chromeless', () => {
    expect(searchManifest.id).toBe('search');
    expect(searchManifest.surface).toBe('chromeless');
    expect(searchManifest.nameKey).toBe('widgets.search');
  });

  it('должен рендерить поле ввода поиска и переключатели поисковых систем', () => {
    render(<SearchWidget instanceId="search-1" settings={{ engine: 'google' }} />);

    expect(screen.getByRole('textbox', { name: /поиск/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yandex/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /duckduckgo/i })).toBeInTheDocument();
  });

  it('должен переключать активную поисковую систему по клику', () => {
    render(<SearchWidget instanceId="search-1" settings={{ engine: 'google' }} />);

    const yandexBtn = screen.getByRole('button', { name: /yandex/i });
    fireEvent.click(yandexBtn);

    const input = screen.getByRole('textbox', { name: /поиск/i });
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('Yandex'));
  });

  it('должен отправлять форму с введенным запросом', () => {
    const originalLocation = window.location;
    const locationAssignMock = vi.fn();
    delete (window as any).location;
    window.location = { ...originalLocation, href: '', assign: locationAssignMock } as any;

    render(<SearchWidget instanceId="search-1" settings={{ engine: 'google' }} />);

    const input = screen.getByRole('textbox', { name: /поиск/i });
    fireEvent.change(input, { target: { value: 'React 19' } });

    const submitBtn = screen.getByRole('button', { name: /найти/i });
    fireEvent.click(submitBtn);

    expect(window.location.href).toContain('https://www.google.com/search?q=React%2019');

    window.location = originalLocation;
  });
});
