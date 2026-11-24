import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DIGEST_SCHEDULE_KEY, DIGEST_SOURCE, GENERATE_DIGEST_MESSAGE } from '@/core/digest/model';
import { t } from '@/core/i18n';
import { itemRepository } from '@/core/items';
import { DigestWidget } from '@/widgets/built-in/DigestWidget/DigestWidget';
import { resetWorkspace } from '../../helpers/workspace';

const mocks = vi.hoisted(() => {
  type StorageListener = (changes: Record<string, { newValue: unknown }>, area: string) => void;
  const listeners = new Set<StorageListener>();
  return {
    sendMessage: vi.fn(),
    get: vi.fn(),
    set: vi.fn(async (values: Record<string, unknown>) => {
      const changes = Object.fromEntries(
        Object.entries(values).map(([key, newValue]) => [key, { newValue }]),
      );
      listeners.forEach((listener) => listener(changes, 'local'));
    }),
    onChanged: {
      addListener: (listener: StorageListener) => listeners.add(listener),
      removeListener: (listener: StorageListener) => listeners.delete(listener),
    },
  };
});
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { sendMessage: mocks.sendMessage },
    storage: { local: { get: mocks.get, set: mocks.set }, onChanged: mocks.onChanged },
  },
}));

describe('Виджет дайджеста', () => {
  beforeEach(async () => {
    await resetWorkspace([]);
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({});
  });

  it('shows a concrete action in the empty state', async () => {
    render(<DigestWidget />);
    expect(await screen.findByText(t('digest.empty'))).toBeInTheDocument();
    expect(screen.getByText(t('digest.emptyHint'))).toBeInTheDocument();
  });

  it('показывает последний непрочитанный выпуск, безопасные ссылки и архив после прочтения', async () => {
    await itemRepository.create(
      { kind: 'digest', title: 'Старый выпуск', status: 'read' },
      DIGEST_SOURCE,
    );
    const latest = await itemRepository.create(
      {
        kind: 'digest',
        title: 'Свежий выпуск',
        status: 'unread',
        body: '## Новости\n- [Источник](<https://example.com/news(a)>)\n- [Скрипт](<javascript:alert(1)>)\n- [Пароль](<https://secret:password@example.com>)\n<img src=x onerror=alert(1)>',
      },
      DIGEST_SOURCE,
    );

    const { container } = render(<DigestWidget />);
    const article = await screen.findByRole('article');
    expect(within(article).getByRole('heading', { name: 'Свежий выпуск' })).toBeInTheDocument();
    expect(within(article).getAllByRole('link')).toHaveLength(1);
    expect(within(article).getByRole('link', { name: 'Источник' })).toHaveAttribute(
      'href',
      'https://example.com/news(a)',
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Архив' })).getByText('Старый выпуск'),
    ).toBeInTheDocument();

    fireEvent.click(within(article).getByRole('button', { name: 'Отметить прочитанным' }));
    expect(await screen.findByText('Все дайджесты прочитаны.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Архив' })).getByText('Свежий выпуск'),
    ).toBeInTheDocument();
    expect(await itemRepository.get(latest.id)).toMatchObject({ status: 'read' });
  });

  it('передаёт ручную сборку воркеру и сохраняет ежедневное расписание', async () => {
    mocks.sendMessage.mockResolvedValue({ success: true });
    render(<DigestWidget />);
    expect(await screen.findByText('Здесь появится ваш первый дайджест.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Собрать «Утро»' }));
    expect(await screen.findByText('Утренний дайджест готов')).toBeInTheDocument();
    expect(mocks.sendMessage).toHaveBeenCalledWith(GENERATE_DIGEST_MESSAGE);

    const schedule = screen.getByRole('checkbox', { name: /Собирать ежедневно/ });
    fireEvent.click(schedule);
    await waitFor(() => expect(schedule).toBeChecked());
    expect(mocks.set).toHaveBeenCalledWith({ [DIGEST_SCHEDULE_KEY]: true });
  });
});
