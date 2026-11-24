import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { InboxWidget } from '@/widgets/built-in/InboxWidget/InboxWidget';
import { itemRepository } from '@/core/items';
import { useI18nStore } from '@/core/i18n';
import { useToastStore } from '@/ui/primitives/Toast';
import { resetWorkspace } from '../../helpers/workspace';

const instance = { instanceId: 'inbox-1', widgetId: 'inbox', settings: {} };
const renderInbox = () => render(<InboxWidget />);

describe('InboxWidget', () => {
  beforeEach(async () => {
    await resetWorkspace([instance]);
    useToastStore.setState({ toasts: [] });
    useI18nStore.getState().setLanguage('ru');
  });

  it.each([
    { locale: 'ru' as const, text: 'Позвонить завтра 10:00 #работа !', title: 'Позвонить' },
    { locale: 'en' as const, text: 'Call tomorrow 10:00 #work !', title: 'Call' },
  ])('быстро захватывает поля Inbox на локали $locale', async ({ locale, text, title }) => {
    const expectedDue = new Date();
    expectedDue.setDate(expectedDue.getDate() + 1);
    expectedDue.setHours(10, 0, 0, 0);
    useI18nStore.getState().setLanguage(locale);
    renderInbox();

    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: locale === 'ru' ? 'Список входящих' : 'Inbox items' }),
      ).toHaveAttribute('aria-busy', 'false'),
    );
    const addButton = screen.getByRole('button', { name: locale === 'ru' ? 'Добавить' : 'Add' });
    fireEvent.change(
      screen.getByRole('textbox', {
        name: locale === 'ru' ? 'Новая входящая запись' : 'New inbox item',
      }),
      {
        target: { value: text },
      },
    );
    fireEvent.click(addButton);

    await waitFor(async () => {
      const created = (await itemRepository.query({ status: 'inbox' }))[0];
      expect(created).toMatchObject({
        title,
        tags: [locale === 'ru' ? 'работа' : 'work'],
        priority: 'high',
        status: 'inbox',
      });
      expect(created?.dueAt).toBe(expectedDue.toISOString());
    });
    expect(await screen.findByText(title)).toBeInTheDocument();
  });

  it('массово удаляет выбранные записи и тостом отменяет удаление', async () => {
    await itemRepository.create(
      { kind: 'task', title: 'Первое', status: 'inbox' },
      { type: 'user', id: 'local', name: 'local' },
    );
    await itemRepository.create(
      { kind: 'task', title: 'Второе', status: 'inbox' },
      { type: 'user', id: 'local', name: 'local' },
    );
    renderInbox();

    await screen.findByText('Первое');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Выбрать все входящие' }));
    fireEvent.click(screen.getByRole('button', { name: 'Действия' }));
    fireEvent.click(await screen.findByRole('button', { name: 'В корзину' }));

    await waitFor(async () =>
      expect(await itemRepository.query({ status: 'inbox' })).toHaveLength(0),
    );
    const toast = useToastStore.getState().toasts.at(-1);
    expect(toast?.action?.label).toBe('Отменить');
    await act(async () => {
      toast?.action?.onClick();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByText('Первое')).toBeInTheDocument();
    expect(await screen.findByText('Второе')).toBeInTheDocument();
  });

  it('перемещает фокус по строкам клавишами J и K', async () => {
    await itemRepository.create(
      { kind: 'task', title: 'Первое', status: 'inbox' },
      { type: 'user', id: 'local', name: 'local' },
    );
    await itemRepository.create(
      { kind: 'task', title: 'Второе', status: 'inbox' },
      { type: 'user', id: 'local', name: 'local' },
    );
    renderInbox();

    await screen.findByText('Первое');
    const rows = screen
      .getAllByText(/Первое|Второе/)
      .map((title) => title.closest<HTMLElement>('[data-inbox-item]'));
    const firstRow = rows[0];
    const secondRow = rows[1];
    expect(firstRow).toBeInstanceOf(HTMLElement);
    expect(secondRow).toBeInstanceOf(HTMLElement);
    firstRow?.focus();
    await userEvent.setup().keyboard('j');
    expect(secondRow).toHaveFocus();
    await userEvent.setup().keyboard('k');
    expect(firstRow).toHaveFocus();
  });
});
