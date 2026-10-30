import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TodoWidget } from '@/widgets/built-in/TodoWidget/TodoWidget';
import { todoManifest } from '@/widgets/built-in/TodoWidget/manifest';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { itemRepository } from '@/core/items';
import { useToastStore } from '@/ui/primitives/Toast';
import { instanceSettings, resetWorkspace, seedLegacyKey } from '../../helpers/workspace';

const instance = { instanceId: 'todo-1', widgetId: 'todo', settings: { filter: 'all' } };

const renderWidget = () => render(<TodoWidget instanceId="todo-1" settings={{ filter: 'all' }} />);

describe('TodoWidget', () => {
  beforeEach(async () => {
    await resetWorkspace([instance]);
    useToastStore.setState({ toasts: [] });
  });

  it('манифест строго типизирован и содержит surface=panel', () => {
    expect(todoManifest.id).toBe('todo');
    expect(todoManifest.surface).toBe('panel');
    expect(todoManifest.nameKey).toBe('widgets.todo');
    expect(todoManifest.permissions).toContain('storage');
  });

  it('переносит задачи 3.8 и привязывает экземпляр к доске', async () => {
    seedLegacyKey(STORAGE_KEYS.TODO_ITEMS, [
      { id: '1', text: 'Первая задача', completed: false, priority: 'high' },
    ]);
    renderWidget();

    expect(await screen.findByText('Первая задача')).toBeInTheDocument();
    const boardId = instanceSettings('todo-1')?.boardId;
    expect(typeof boardId).toBe('string');
    expect(
      (await itemRepository.query({ boardId: boardId as string })).map((i) => i.title),
    ).toEqual(['Первая задача']);
  });

  it('в новом профиле показывает стартовые задачи', async () => {
    renderWidget();
    expect(await screen.findByText('Установить расширение DashFlow')).toBeInTheDocument();
    expect(screen.getByText('Настроить сетку и виджеты')).toBeInTheDocument();
  });

  it('добавляет задачу через команду', async () => {
    renderWidget();
    await screen.findByText('Настроить сетку и виджеты');

    fireEvent.change(screen.getByRole('textbox', { name: /новая задача/i }), {
      target: { value: 'Купить молоко' },
    });
    fireEvent.click(screen.getByRole('button', { name: /добавить/i }));

    expect(await screen.findByText('Купить молоко')).toBeInTheDocument();
    const created = (await itemRepository.query({ kind: 'task' })).find(
      (item) => item.title === 'Купить молоко',
    );
    expect(created).toMatchObject({ status: 'todo', priority: 'medium', source: { type: 'user' } });
  });

  it('отмечает задачу выполненной', async () => {
    renderWidget();
    fireEvent.click(await screen.findByText('Настроить сетку и виджеты'));

    await waitFor(async () => {
      const task = (await itemRepository.query({ kind: 'task' })).find(
        (item) => item.title === 'Настроить сетку и виджеты',
      );
      expect(task?.status).toBe('done');
    });
  });

  it('удаление показывает тост, «Отменить» возвращает задачу', async () => {
    renderWidget();
    await screen.findByText('Настроить сетку и виджеты');

    fireEvent.click(
      screen.getByRole('button', { name: /удалить задачу: настроить сетку и виджеты/i }),
    );
    await waitFor(() => expect(screen.queryByText('Настроить сетку и виджеты')).toBeNull());

    const toast = useToastStore.getState().toasts.at(-1);
    expect(toast?.action?.label).toBe('Отменить');
    await act(async () => {
      toast?.action?.onClick();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByText('Настроить сетку и виджеты')).toBeInTheDocument();
  });

  it('привычки работают в прежнем формате', async () => {
    seedLegacyKey(STORAGE_KEYS.HABIT_ITEMS, [{ id: 'h1', title: 'Пить воду', history: {} }]);
    render(<TodoWidget instanceId="todo-1" settings={{ defaultTab: 'habits' }} />);

    expect(await screen.findByText('Пить воду')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /отметить пн для пить воду/i }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.HABIT_ITEMS) ?? '[]') as {
        history: Record<string, boolean>;
      }[];
      expect(Object.keys(saved[0]?.history ?? {})).toHaveLength(1);
    });
  });
});
