import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BookmarksWidget } from '@/widgets/built-in/BookmarksWidget/BookmarksWidget';
import { bookmarksManifest } from '@/widgets/built-in/BookmarksWidget/manifest';

describe('BookmarksWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('манифест должен содержать permissions bookmarks и surface=tiles', () => {
    expect(bookmarksManifest.id).toBe('bookmarks');
    expect(bookmarksManifest.surface).toBe('tiles');
    expect(bookmarksManifest.nameKey).toBe('widgets.bookmarks');
    expect(bookmarksManifest.permissions).toContain('bookmarks');
  });

  it('должен отображать одиночную плитку при mode=single', () => {
    render(
      <BookmarksWidget
        instanceId="bm-1"
        settings={{
          mode: 'single',
          singleTitle: 'Мой проект',
          singleUrl: 'https://dashflow.dev',
        }}
      />,
    );

    expect(screen.getByText('Мой проект')).toBeInTheDocument();
  });

  it('должен отображать список закладок папки при mode=folder', async () => {
    render(
      <BookmarksWidget
        instanceId="bm-1"
        settings={{ mode: 'folder', selectedFolderId: '1', viewMode: 'tiles' }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('DashFlow GitHub')).toBeInTheDocument();
      expect(screen.getByText('React 19 Documentation')).toBeInTheDocument();
    });
  });
});
