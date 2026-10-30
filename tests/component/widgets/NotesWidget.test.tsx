import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotesWidget } from '@/widgets/built-in/NotesWidget/NotesWidget';
import { notesManifest } from '@/widgets/built-in/NotesWidget/manifest';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { itemRepository } from '@/core/items';
import { instanceSettings, resetWorkspace, seedLegacyKey } from '../../helpers/workspace';

const instance = { instanceId: 'notes-1', widgetId: 'notes', settings: {} };

const noteText = () => screen.findByRole('textbox', { name: /заметки/i });

describe('NotesWidget', () => {
  beforeEach(async () => {
    await resetWorkspace([instance]);
  });

  it('манифест строго типизирован и содержит surface=panel', () => {
    expect(notesManifest.id).toBe('notes');
    expect(notesManifest.surface).toBe('panel');
    expect(notesManifest.nameKey).toBe('widgets.notes');
    expect(notesManifest.permissions).toContain('storage');
  });

  it('переносит заметку 3.8 экземпляра и привязывает к ней виджет', async () => {
    seedLegacyKey(`${STORAGE_KEYS.NOTES_CONTENT}_notes-1`, 'Моя сохранённая заметка');
    render(<NotesWidget instanceId="notes-1" settings={{ fontSize: 14 }} />);

    await waitFor(async () => expect(await noteText()).toHaveValue('Моя сохранённая заметка'));
    const itemId = instanceSettings('notes-1')?.itemId as string;
    expect((await itemRepository.get(itemId))?.title).toBe('Моя сохранённая заметка');
  });

  it('сохраняет правку в Item и обновляет заголовок', async () => {
    render(<NotesWidget instanceId="notes-1" settings={{ fontSize: 14 }} />);
    const textarea = await noteText();
    await waitFor(() => expect(textarea).not.toHaveValue(''));

    fireEvent.change(textarea, { target: { value: '# Новая важная мысль\nдетали' } });

    await waitFor(
      async () => {
        const itemId = instanceSettings('notes-1')?.itemId as string;
        expect(await itemRepository.get(itemId)).toMatchObject({
          body: '# Новая важная мысль\nдетали',
          title: 'Новая важная мысль',
        });
      },
      { timeout: 2000 },
    );
  });

  it('правка в пределах дебаунса сохраняется при закрытии виджета', async () => {
    const { unmount } = render(<NotesWidget instanceId="notes-1" settings={{}} />);
    const textarea = await noteText();
    await waitFor(() => expect(textarea).not.toHaveValue(''));

    fireEvent.change(textarea, { target: { value: 'Успел написать' } });
    unmount();

    await waitFor(async () => {
      const itemId = instanceSettings('notes-1')?.itemId as string;
      expect((await itemRepository.get(itemId))?.body).toBe('Успел написать');
    });
  });
});
