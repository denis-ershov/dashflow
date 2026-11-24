import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuickCaptureForm } from '@/features/capture/QuickCaptureForm';
import { itemRepository } from '@/core/items';
import { useI18nStore } from '@/core/i18n';
import { resetWorkspace } from '../../helpers/workspace';

describe('Окно быстрого захвата', () => {
  const page = { url: 'https://example.test/reference', title: 'Справка' };

  beforeEach(async () => {
    await resetWorkspace([]);
  });

  it('на Enter сохраняет задачу с датой и тегами, оставляя адрес вкладки без галочки', async () => {
    useI18nStore.setState({ language: 'en' });
    const user = userEvent.setup();
    render(<QuickCaptureForm page={page} onClose={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'New Inbox item' });
    expect(input).toHaveFocus();
    await user.type(input, 'Call tomorrow 10:00 #work !{Enter}');
    expect(await screen.findByText('Added to Inbox')).toBeInTheDocument();
    const due = new Date();
    due.setDate(due.getDate() + 1);
    due.setHours(10, 0, 0, 0);
    const entries = await itemRepository.query({ status: 'inbox' });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'task',
      title: 'Call',
      tags: ['work'],
      priority: 'high',
      dueAt: due.toISOString(),
    });
    expect(entries[0]?.url).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Close window' })).toHaveFocus();
  });

  it('сохраняет текущую вкладку как ссылку после явного выбора', async () => {
    render(<QuickCaptureForm page={page} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Прикрепить текущую вкладку/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить во Входящие' }));
    expect(await screen.findByText('Добавлено во Входящие')).toBeInTheDocument();
    expect(await itemRepository.query({ status: 'inbox' })).toMatchObject([
      { ...page, kind: 'link' },
    ]);
  });

  it('оставляет введённый текст для исправления ошибки даты', async () => {
    render(<QuickCaptureForm onClose={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Новая запись во Входящих' });
    fireEvent.change(input, { target: { value: 'Позвонить завтра 31:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить во Входящие' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Проверьте текст, дату и теги.');
    expect(input).toHaveValue('Позвонить завтра 31:00');
    await waitFor(async () =>
      expect(await itemRepository.query({ status: 'inbox' })).toHaveLength(0),
    );
  });
});
