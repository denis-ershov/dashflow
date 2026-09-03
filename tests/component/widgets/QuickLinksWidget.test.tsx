import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickLinksWidget } from '@/widgets/built-in/QuickLinksWidget/QuickLinksWidget';
import { quickLinksManifest } from '@/widgets/built-in/QuickLinksWidget/manifest';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';

describe('QuickLinksWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('манифест должен содержать surface=tiles', () => {
    expect(quickLinksManifest.id).toBe('quickLinks');
    expect(quickLinksManifest.surface).toBe('tiles');
    expect(quickLinksManifest.nameKey).toBe('widgets.quickLinks');
    expect(quickLinksManifest.permissions).toContain('storage');
  });

  it('должен отображать ссылки из хранилища', async () => {
    vi.spyOn(StorageAdapter, 'get').mockResolvedValue([
      { id: '1', title: 'GitHub', url: 'https://github.com' },
      { id: '2', title: 'Google', url: 'https://google.com' },
    ]);

    render(<QuickLinksWidget instanceId="links-1" settings={{ showTitles: true }} />);

    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
  });

  it('должен открывать форму добавления и сохранять новую ссылку', async () => {
    vi.spyOn(StorageAdapter, 'get').mockResolvedValue([]);
    const setSpy = vi.spyOn(StorageAdapter, 'set').mockResolvedValue();

    render(<QuickLinksWidget instanceId="links-1" settings={{ showTitles: true }} />);

    const addBtn = await screen.findByRole('button', { name: /добавить/i });
    fireEvent.click(addBtn);

    const titleInput = screen.getByPlaceholderText(/название ссылки/i);
    const urlInput = screen.getByPlaceholderText(/url/i);

    fireEvent.change(titleInput, { target: { value: 'MDN Web Docs' } });
    fireEvent.change(urlInput, { target: { value: 'developer.mozilla.org' } });

    const saveBtn = screen.getByRole('button', { name: /сохранить/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(setSpy).toHaveBeenCalledWith(
        STORAGE_KEYS.QUICK_LINKS,
        expect.arrayContaining([
          expect.objectContaining({
            title: 'MDN Web Docs',
            url: 'https://developer.mozilla.org',
          }),
        ]),
      );
    });
  });
});
