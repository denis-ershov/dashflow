import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuotesWidget } from '@/widgets/built-in/QuotesWidget/QuotesWidget';
import { quotesManifest } from '@/widgets/built-in/QuotesWidget/manifest';

describe('QuotesWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('манифест должен быть строго типизирован и содержать surface=panel', () => {
    expect(quotesManifest.id).toBe('quotes');
    expect(quotesManifest.surface).toBe('panel');
    expect(quotesManifest.nameKey).toBe('widgets.quotes');
  });

  it('должен отображать текст и автора начальной цитаты', () => {
    render(<QuotesWidget instanceId="quote-1" settings={{ category: 'all' }} />);

    expect(screen.getByText(/простота — необходимое условие надежности/i)).toBeInTheDocument();
    expect(screen.getByText(/эдсгер дейкстра/i)).toBeInTheDocument();
  });

  it('должен переключать на следующую цитату по клику', () => {
    render(<QuotesWidget instanceId="quote-1" settings={{ category: 'all' }} />);

    const nextBtn = screen.getByRole('button', { name: /следующая цитата/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/сначала решите проблему/i)).toBeInTheDocument();
  });

  it('должен копировать текст цитаты в буфер обмена', async () => {
    const clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: clipboardSpy },
    });

    render(<QuotesWidget instanceId="quote-1" settings={{ category: 'all' }} />);

    const copyBtn = screen.getByRole('button', { name: /копировать цитату/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalledWith(
        expect.stringContaining('Простота — необходимое условие надежности.'),
      );
    });
  });
});
