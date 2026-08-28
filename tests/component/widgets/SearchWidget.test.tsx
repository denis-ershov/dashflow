import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchWidget } from '@/widgets/built-in/SearchWidget/SearchWidget';
import { searchManifest } from '@/widgets/built-in/SearchWidget/manifest';

describe('SearchWidget Component & Manifest', () => {
  it('манифест должен быть строго типизирован и содержать surface=chromeless и category=hero', () => {
    expect(searchManifest.id).toBe('search');
    expect(searchManifest.surface).toBe('chromeless');
    expect(searchManifest.nameKey).toBe('widgets.search');
    expect(searchManifest.category).toBe('hero');
  });

  it('должен рендерить поле ввода поиска в режиме bar', () => {
    render(<SearchWidget instanceId="search-1" settings={{ engine: 'google', searchStyle: 'bar' }} />);

    expect(screen.getByRole('textbox', { name: /строка поиска/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /выбрать поисковую систему/i })).toBeInTheDocument();
  });

  it('должен переключать активную поисковую систему по клику в режиме tiles', () => {
    render(<SearchWidget instanceId="search-1" settings={{ engine: 'google', searchStyle: 'tiles' }} />);

    const yandexBtn = screen.getByRole('button', { name: /яндекс/i });
    fireEvent.click(yandexBtn);

    const input = screen.getByRole('textbox', { name: /поиск/i });
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('Яндекс'));
  });

  it('должен отправлять форму с введенным запросом', () => {
    const originalHref = window.location.href;
    let assignedHref = '';
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        set href(val: string) {
          assignedHref = val;
        },
        get href() {
          return assignedHref || originalHref;
        },
      },
      writable: true,
      configurable: true,
    });

    render(<SearchWidget instanceId="search-1" settings={{ engine: 'google', searchStyle: 'bar' }} />);

    const input = screen.getByRole('textbox', { name: /строка поиска/i });
    fireEvent.change(input, { target: { value: 'React 19' } });

    const submitBtn = screen.getByRole('button', { name: /искать/i });
    fireEvent.click(submitBtn);

    expect(assignedHref).toContain('https://www.google.com/search?q=React%2019');
  });
});
