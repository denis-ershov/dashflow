import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodoWidget } from '@/widgets/built-in/TodoWidget/TodoWidget';
import { todoManifest } from '@/widgets/built-in/TodoWidget/manifest';
import { StorageAdapter } from '@/core/storage/StorageAdapter';

describe('TodoWidget Component & Manifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('манифест должен быть строго типизирован и содержать surface=panel', () => {
    expect(todoManifest.id).toBe('todo');
    expect(todoManifest.surface).toBe('panel');
    expect(todoManifest.nameKey).toBe('widgets.todo');
    expect(todoManifest.permissions).toContain('storage');
  });

  it('должен отображать задачи из хранилища', async () => {
    vi.spyOn(StorageAdapter, 'get').mockImplementation((key) => {
      if (key === 'dashflow_widget_todo_items') {
        return Promise.resolve([
          { id: '1', text: 'Первая задача', completed: false, priority: 'high' },
        ]);
      }
      return Promise.resolve([]);
    });

    render(<TodoWidget instanceId="todo-1" settings={{ filter: 'all' }} />);

    await waitFor(() => {
      expect(screen.getByText('Первая задача')).toBeInTheDocument();
    });
  });

  it('должен добавлять новую задачу и сохранять в StorageAdapter', async () => {
    vi.spyOn(StorageAdapter, 'get').mockResolvedValue([]);
    const setSpy = vi.spyOn(StorageAdapter, 'set').mockResolvedValue();

    render(<TodoWidget instanceId="todo-1" settings={{ filter: 'all' }} />);

    const input = screen.getByRole('textbox', { name: /новая задача/i });
    fireEvent.change(input, { target: { value: 'Купить молоко' } });

    const addBtn = screen.getByRole('button', { name: /добавить/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Купить молоко')).toBeInTheDocument();
    });

    expect(setSpy).toHaveBeenCalledWith(
      'dashflow_widget_todo_items',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Купить молоко', completed: false }),
      ]),
    );
  });

  it('должен переключать статус выполнения задачи', async () => {
    vi.spyOn(StorageAdapter, 'get').mockImplementation((key) => {
      if (key === 'dashflow_widget_todo_items') {
        return Promise.resolve([
          { id: '1', text: 'Сделать рефакторинг', completed: false, priority: 'medium' },
        ]);
      }
      return Promise.resolve([]);
    });
    const setSpy = vi.spyOn(StorageAdapter, 'set').mockResolvedValue();

    render(<TodoWidget instanceId="todo-1" settings={{ filter: 'all' }} />);

    await waitFor(() => {
      expect(screen.getByText('Сделать рефакторинг')).toBeInTheDocument();
    });

    const item = screen.getByText('Сделать рефакторинг');
    fireEvent.click(item);

    expect(setSpy).toHaveBeenCalledWith(
      'dashflow_widget_todo_items',
      expect.arrayContaining([expect.objectContaining({ id: '1', completed: true })]),
    );
  });

  it('должен переключаться на вкладку привычек и отмечать день', async () => {
    vi.spyOn(StorageAdapter, 'get').mockImplementation((key) => {
      if (key === 'dashflow_widget_habit_items') {
        return Promise.resolve([{ id: 'h1', title: 'Пить воду', history: {} }]);
      }
      return Promise.resolve([]);
    });
    const setSpy = vi.spyOn(StorageAdapter, 'set').mockResolvedValue();

    render(<TodoWidget instanceId="todo-1" settings={{ defaultTab: 'habits' }} />);

    await waitFor(() => {
      expect(screen.getByText('Пить воду')).toBeInTheDocument();
    });

    const dayBtn = screen.getByRole('button', { name: /отметить пн для пить воду/i });
    fireEvent.click(dayBtn);

    expect(setSpy).toHaveBeenCalledWith(
      'dashflow_widget_habit_items',
      expect.arrayContaining([expect.objectContaining({ id: 'h1' })]),
    );
  });
});
