import React, { useState, useEffect, useId } from 'react';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { Button } from '@/ui/primitives';
import { EmptyState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { TodoItem, TodoPriority, TodoFilter, TodoSettings } from './types';

const DEFAULT_TODOS: TodoItem[] = [
  { id: '1', text: 'Установить DashFlow расширение', completed: true, priority: 'high' },
  { id: '2', text: 'Настроить сетку и виджеты', completed: false, priority: 'medium' },
];

export const TodoWidget: React.FC<WidgetProps<TodoSettings>> = ({ settings }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<TodoPriority>(settings?.defaultPriority || 'medium');
  const [activeFilter, setActiveFilter] = useState<TodoFilter>(settings?.filter || 'all');
  const prioritySelectId = useId();

  useEffect(() => {
    StorageAdapter.get<TodoItem[]>(STORAGE_KEYS.TODO_ITEMS, DEFAULT_TODOS).then(setTodos);
  }, []);

  const saveTodos = async (newTodos: TodoItem[]) => {
    setTodos(newTodos);
    await StorageAdapter.set(STORAGE_KEYS.TODO_ITEMS, newTodos);
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const newItem: TodoItem = {
      id: Date.now().toString(),
      text: trimmed,
      completed: false,
      priority,
      createdAt: Date.now(),
    };

    saveTodos([newItem, ...todos]);
    setInput('');
  };

  const toggleTodo = (id: string) => {
    saveTodos(
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  const deleteTodo = (id: string) => {
    saveTodos(todos.filter((t) => t.id !== id));
  };

  const filteredTodos = todos.filter((todo) => {
    if (activeFilter === 'active') return !todo.completed;
    if (activeFilter === 'completed') return todo.completed;
    return true;
  });

  const priorityColorClass = {
    low: 'text-info',
    medium: 'text-warning',
    high: 'text-danger',
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3 select-none">
      {/* Форма добавления */}
      <form onSubmit={addTodo} className="flex items-center gap-2">
        <input
          type="text"
          aria-label="Новая задача"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Новая задача..."
          className="flex-1 bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded-lg px-3 py-2 min-h-[38px] focus-visible:outline-none focus-visible:border-primary"
        />

        <label htmlFor={prioritySelectId} className="sr-only">Приоритет задачи</label>
        <select
          id={prioritySelectId}
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoPriority)}
          className="bg-surface text-xs text-fg border border-line rounded-lg px-2 py-2 min-h-[38px] focus-visible:outline-none cursor-pointer"
        >
          <option value="low">Низкий</option>
          <option value="medium">Средний</option>
          <option value="high">Высокий</option>
        </select>

        <Button
          size="sm"
          variant="primary"
          type="submit"
          aria-label="Добавить задачу"
          icon={<Plus className="w-4 h-4" />}
        >
          Добавить
        </Button>
      </form>

      {/* Фильтры */}
      <div className="flex items-center gap-1 border-b border-line/40 pb-2">
        {(['all', 'active', 'completed'] as const).map((filterKey) => (
          <button
            key={filterKey}
            type="button"
            onClick={() => setActiveFilter(filterKey)}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-medium transition-colors',
              activeFilter === filterKey
                ? 'bg-surface-hover text-primary font-semibold'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {filterKey === 'all' && 'Все'}
            {filterKey === 'active' && 'Активные'}
            {filterKey === 'completed' && 'Завершенные'}
          </button>
        ))}
      </div>

      {/* Список задач */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filteredTodos.length === 0 ? (
          <EmptyState
            title="Задач нет"
            description="Список задач пуст. Добавьте новую задачу выше!"
          />
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                'group flex items-center justify-between p-2.5 rounded-lg bg-surface/80 border border-line/60 hover:border-line transition-all',
                todo.completed && 'opacity-60 bg-surface/40',
              )}
            >
              <button
                type="button"
                onClick={() => toggleTodo(todo.id)}
                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 text-left"
              >
                {todo.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <Circle className={cn('w-4 h-4 shrink-0', priorityColorClass[todo.priority])} />
                )}
                <span
                  className={cn(
                    'text-xs truncate text-fg',
                    todo.completed && 'line-through text-fg-muted',
                  )}
                >
                  {todo.text}
                </span>
              </button>

              <button
                type="button"
                aria-label="Удалить задачу"
                onClick={() => deleteTodo(todo.id)}
                className="p-1.5 text-fg-muted hover:text-danger rounded hover:bg-danger/10 transition-colors ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
