import React, { useState, useEffect } from 'react';
import { StorageAdapter } from '@/services/storage/StorageAdapter';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const TodoWidget: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    StorageAdapter.get<TodoItem[]>('widget_todo_items', [
      { id: '1', text: 'Установить DashFlow расширение', completed: true, priority: 'high' },
      { id: '2', text: 'Настроить сетку и виджеты', completed: false, priority: 'medium' },
    ]).then(setTodos);
  }, []);

  const saveTodos = async (newTodos: TodoItem[]) => {
    setTodos(newTodos);
    await StorageAdapter.set('widget_todo_items', newTodos);
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newItem: TodoItem = {
      id: Date.now().toString(),
      text: input.trim(),
      completed: false,
      priority,
    };

    saveTodos([newItem, ...todos]);
    setInput('');
  };

  const toggleTodo = (id: string) => {
    saveTodos(
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (id: string) => {
    saveTodos(todos.filter((t) => t.id !== id));
  };

  const priorityColors = {
    low: 'text-blue-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <form onSubmit={addTodo} className="flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Новая задача..."
          className="flex-1 bg-[var(--color-surface)] text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          className="bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-xl px-2 py-2 focus:outline-none cursor-pointer"
        >
          <option value="low">Низкий</option>
          <option value="medium">Средний</option>
          <option value="high">Высокий</option>
        </select>
        <Button size="sm" variant="primary" type="submit" icon={<Plus className="w-4 h-4" />}>
          ОК
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {todos.length === 0 ? (
          <div className="text-center text-xs text-[var(--color-text-muted)] py-6">
            Задач пока нет. Добавьте первую!
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)]/60 hover:border-[var(--color-border)] transition-all ${
                todo.completed ? 'opacity-50' : ''
              }`}
            >
              <div
                onClick={() => toggleTodo(todo.id)}
                className="flex items-center space-x-2.5 cursor-pointer flex-1 min-w-0"
              >
                {todo.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className={`w-4 h-4 shrink-0 ${priorityColors[todo.priority]}`} />
                )}
                <span
                  className={`text-xs truncate ${
                    todo.completed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'
                  }`}
                >
                  {todo.text}
                </span>
              </div>

              <button
                onClick={() => deleteTodo(todo.id)}
                className="p-1 text-[var(--color-text-muted)] hover:text-red-400 transition-colors ml-2"
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
