import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickLinksWidget } from '@/widgets/built-in/QuickLinksWidget/QuickLinksWidget';
import { quickLinksManifest } from '@/widgets/built-in/QuickLinksWidget/manifest';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { itemRepository } from '@/core/items';
import { resetWorkspace, seedLegacyKey } from '../../helpers/workspace';

const instance = { instanceId: 'links-1', widgetId: 'quickLinks', settings: {} };

describe('QuickLinksWidget', () => {
  beforeEach(async () => {
    await resetWorkspace([instance]);
  });

  it('манифест содержит surface=tiles', () => {
    expect(quickLinksManifest.id).toBe('quickLinks');
    expect(quickLinksManifest.surface).toBe('tiles');
    expect(quickLinksManifest.nameKey).toBe('widgets.quickLinks');
    expect(quickLinksManifest.permissions).toContain('storage');
  });

  it('переносит ссылки 3.8 и показывает их как ссылки', async () => {
    seedLegacyKey(STORAGE_KEYS.QUICK_LINKS, [
      { id: '1', title: 'MDN', url: 'https://developer.mozilla.org' },
      { id: '2', title: 'WXT', url: 'https://wxt.dev' },
    ]);
    render(<QuickLinksWidget instanceId="links-1" settings={{ showTitles: true }} />);

    const link = await screen.findByRole('link', { name: /mdn/i });
    expect(link).toHaveAttribute('href', 'https://developer.mozilla.org');
    expect(screen.getByText('WXT')).toBeInTheDocument();
  });

  it('добавляет ссылку, дописывая https://, и отвергает небезопасный адрес', async () => {
    render(<QuickLinksWidget instanceId="links-1" settings={{ showTitles: true }} />);
    await screen.findByText('GitHub'); // стартовые ссылки нового профиля

    const add = async (title: string, url: string) => {
      fireEvent.click(screen.getByRole('button', { name: /добавить/i }));
      fireEvent.change(screen.getByPlaceholderText(/название ссылки/i), {
        target: { value: title },
      });
      fireEvent.change(screen.getByPlaceholderText(/url/i), { target: { value: url } });
      fireEvent.click(screen.getByRole('button', { name: /сохранить/i }));
      await Promise.resolve();
    };

    await add('MDN Web Docs', 'developer.mozilla.org');
    await waitFor(async () => {
      const links = await itemRepository.query({ kind: 'link' });
      expect(links.map((l) => l.url)).toContain('https://developer.mozilla.org');
    });

    await add('Плохая', 'javascript:alert(1)');
    const links = await itemRepository.query({ kind: 'link' });
    expect(links.some((l) => l.title === 'Плохая')).toBe(false);
  });
});
