import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NotesWidget } from '@/widgets/built-in/NotesWidget/NotesWidget';
import { notesManifest } from '@/widgets/built-in/NotesWidget/manifest';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';

describe('NotesWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('манифест должен быть строго типизирован и содержать surface=panel', () => {
    expect(notesManifest.id).toBe('notes');
    expect(notesManifest.surface).toBe('panel');
    expect(notesManifest.nameKey).toBe('widgets.notes');
    expect(notesManifest.permissions).toContain('storage');
  });

  it('должен загружать заметки из StorageAdapter', async () => {
    vi.spyOn(StorageAdapter, 'get').mockResolvedValue('Моя сохраненная заметка');

    render(<NotesWidget instanceId="notes-1" settings={{ fontSize: 14 }} />);

    await waitFor(() => {
      const textarea = screen.getByRole('textbox', { name: /заметки/i });
      expect(textarea).toHaveValue('Моя сохраненная заметка');
    });
  });

  it('должен сохранять текст в StorageAdapter при изменении', () => {
    vi.useFakeTimers();
    vi.spyOn(StorageAdapter, 'get').mockResolvedValue('');
    const setSpy = vi.spyOn(StorageAdapter, 'set').mockResolvedValue();

    render(<NotesWidget instanceId="notes-1" settings={{ fontSize: 14 }} />);

    const textarea = screen.getByRole('textbox', { name: /заметки/i });
    act(() => {
      fireEvent.change(textarea, { target: { value: 'Новая важная мысль' } });
      vi.advanceTimersByTime(400);
    });

    expect(setSpy).toHaveBeenCalledWith(
      STORAGE_KEYS.NOTES_CONTENT,
      'Новая важная мысль',
    );

    vi.useRealTimers();
  });
});
