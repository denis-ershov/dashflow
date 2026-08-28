import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BookmarksWidget } from '@/widgets/built-in/BookmarksWidget/BookmarksWidget';
import { bookmarksManifest } from '@/widgets/built-in/BookmarksWidget/manifest';

describe('BookmarksWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('манифест должен содержать permissions bookmarks, surface=tiles и схему визуальных настроек', () => {
    expect(bookmarksManifest.id).toBe('bookmarks');
    expect(bookmarksManifest.surface).toBe('tiles');
    expect(bookmarksManifest.nameKey).toBe('widgets.bookmarks');
    expect(bookmarksManifest.permissions).toContain('bookmarks');

    const schemaKeys = bookmarksManifest.settingsSchema?.map((s) => s.key);
    expect(schemaKeys).toContain('tileShape');
    expect(schemaKeys).toContain('tileSize');
    expect(schemaKeys).toContain('cardStyle');
    expect(schemaKeys).toContain('borderRadius');
    expect(schemaKeys).toContain('columns');
  });

  it('должен отображать одиночную плитку при mode=single', () => {
    render(
      <BookmarksWidget
        instanceId="bm-1"
        settings={{
          mode: 'single',
          singleTitle: 'Мой проект',
          singleUrl: 'https://dashflow.dev',
          tileShape: 'square',
        }}
      />,
    );

    expect(screen.getByText('Мой проект')).toBeInTheDocument();
  });

  it('должен отображать список закладок папки при mode=folder', async () => {
    render(
      <BookmarksWidget
        instanceId="bm-1"
        settings={{
          mode: 'folder',
          selectedFolderId: '1',
          viewMode: 'tiles',
          tileShape: 'square',
          cardStyle: 'glass',
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('DashFlow GitHub')).toBeInTheDocument();
      expect(screen.getByText('React 19 Documentation')).toBeInTheDocument();
    });
  });

  it('должен поддерживать плоский список (structureMode=flatten) со сбором всех вложенных закладок', async () => {
    render(
      <BookmarksWidget
        instanceId="bm-flatten"
        settings={{
          mode: 'folder',
          selectedFolderId: '1',
          structureMode: 'flatten',
          viewMode: 'tiles',
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('DashFlow GitHub')).toBeInTheDocument();
      expect(screen.getByText('Vite Guide')).toBeInTheDocument();
      expect(screen.getByText('MDN Web Docs')).toBeInTheDocument();
    });
  });

  it('должен отображать вкладки Закладки / Вкладки / Недавние при mode=folder-tabs', () => {
    render(
      <BookmarksWidget
        instanceId="bm-1"
        settings={{ mode: 'folder-tabs', activeTab: 'bookmarks' }}
      />,
    );

    expect(screen.getByRole('button', { name: /^Закладки$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Вкладки/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Недавние$/i })).toBeInTheDocument();
  });
});
