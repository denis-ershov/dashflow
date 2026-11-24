import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemRepository } from '@/core/items';
import { t } from '@/core/i18n';
import { AgendaWidget } from '@/widgets/built-in/AgendaWidget/AgendaWidget';
import { setCalendarConnection } from '@/widgets/built-in/AgendaWidget/calendarConnection';
import { resetWorkspace } from '../../helpers/workspace';

const today = new Date(2026, 10, 23);
vi.mock('@/core/datetime/useNow', () => ({ useNow: () => today }));

beforeEach(async () => {
  setCalendarConnection(undefined);
  await resetWorkspace([{ instanceId: 'agenda-1', widgetId: 'agenda', settings: {} }]);
});
afterEach(() => vi.unstubAllGlobals());

describe('Agenda empty state hint', () => {
  it('explains how to add calendar events or task deadlines', async () => {
    render(<AgendaWidget />);
    expect(await screen.findByText(t('agenda.empty'))).toBeInTheDocument();
    expect(screen.getByText(t('agenda.emptyHint'))).toBeInTheDocument();
  });
});

describe('Повестка дня', () => {
  it('показывает локальные сроки без календаря и переключает неделю с клавиатуры', async () => {
    const source = { type: 'user', id: 'local', name: 'local' } as const;
    await itemRepository.create(
      {
        kind: 'task',
        title: 'Сегодняшняя задача',
        dueAt: new Date(2026, 10, 23, 9).toISOString(),
      },
      source,
    );
    await itemRepository.create(
      {
        kind: 'task',
        title: 'Задача на четверг',
        dueAt: new Date(2026, 10, 26, 14).toISOString(),
      },
      source,
    );
    render(<AgendaWidget />);
    expect(await screen.findByText('Сегодняшняя задача')).toBeInTheDocument();
    expect(screen.queryByText('Задача на четверг')).not.toBeInTheDocument();
    const week = screen.getByRole('button', { name: 'Неделя' });
    week.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(await screen.findByText('Задача на четверг')).toBeInTheDocument();
    expect(week).toHaveAttribute('aria-pressed', 'true');
  });

  it('запрашивает лишь хост, загружает ICS после разрешения и не показывает секретную ссылку', async () => {
    let granted = false;
    const request = vi.fn((_: unknown, done: (status: boolean) => void) => {
      granted = true;
      done(true);
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response(
            'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261123\r\nSUMMARY:Событие\r\nEND:VEVENT\r\nEND:VCALENDAR',
          ),
      );
    vi.stubGlobal('chrome', {
      runtime: { id: 'test' },
      permissions: {
        request,
        contains: (_: unknown, done: (status: boolean) => void) => done(granted),
      },
    });
    vi.stubGlobal('fetch', fetchImpl);
    render(<AgendaWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Подключение календаря' }));
    const dialog = await screen.findByRole('dialog');
    const url = 'https://calendar.example.test/private.ics?token=secret-token';
    const input = within(dialog).getByLabelText('Закрытая ссылка на календарь (ICS)');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.change(input, { target: { value: url } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Подключить' }));

    expect(request).toHaveBeenCalledWith(
      { origins: ['https://calendar.example.test/*'], permissions: [] },
      expect.any(Function),
    );
    expect(await screen.findByText('Событие')).toBeInTheDocument();
    expect(screen.getByText('Весь день')).toBeInTheDocument();
    expect(screen.queryByText(/secret-token/)).not.toBeInTheDocument();
    expect(fetchImpl).toHaveBeenCalledWith(url, expect.objectContaining({ redirect: 'error' }));

    fireEvent.click(screen.getByRole('button', { name: 'Подключение календаря' }));
    expect(screen.getByLabelText('Закрытая ссылка на календарь (ICS)')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Отключить' }));
    await waitFor(() => expect(screen.queryByText('Событие')).not.toBeInTheDocument());
  });
});
