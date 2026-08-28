import React, { useState, useEffect, useId } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, CheckCheck, Flame, Calendar, CheckSquare } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { Button, Badge } from '@/ui/primitives';
import { EmptyState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { TodoItem, TodoPriority, TodoFilter, TodoSettings, HabitItem, TodoTab } from './types';

const DEFAULT_TODOS: TodoItem[] = [
  { id: '1', text: 'Установить DashFlow расширение', completed: true, priority: 'high' },
  { id: '2', text: 'Настроить сетку и виджеты', completed: false, priority: 'medium' },
];

const DEFAULT_HABITS: HabitItem[] = [
  { id: '1', title: 'Пить 2л воды', history: {} },
  { id: '2', title: 'Чтение 20 минут', history: {} },
  { id: '3', title: 'Утренняя зарядка', history: {} },
];

const getDaysOfWeek = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);

  const days: { dateStr: string; label: string; isToday: boolean }[] = [];
  const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const todayStr = now.toISOString().split('T')[0];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      dateStr,
      label: dayLabels[i],
      isToday: dateStr === todayStr,
    });
  }
  return days;
};

const calculateStreak = (history: Record<string, boolean>) => {
  let streak = 0;
  const d = new Date();
  while (true) {
    const dateStr = d.toISOString().split('T')[0];
    if (history[dateStr]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      if (streak === 0) {
        d.setDate(d.getDate() - 1);
        const yStr = d.toISOString().split('T')[0];
        if (history[yStr]) {
          streak++;
          d.setDate(d.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }
  return streak;
};

export const TodoWidget: React.FC<WidgetProps<TodoSettings>> = ({ settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<TodoTab>(settings?.defaultTab || 'todos');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<TodoPriority>(settings?.defaultPriority || 'medium');
  const [activeFilter, setActiveFilter] = useState<TodoFilter>(settings?.filter || 'all');
  const showProgress = settings?.showProgress !== false;
  const prioritySelectId = useId();

  const weekDays = getDaysOfWeek();

  useEffect(() => {
    if (settings?.defaultTab) {
      setActiveTab(settings.defaultTab);
    }
  }, [settings?.defaultTab]);

  useEffect(() => {
    if (settings?.defaultPriority) {
      setPriority(settings.defaultPriority);
    }
  }, [settings?.defaultPriority]);

  useEffect(() => {
    if (settings?.filter) {
      setActiveFilter(settings.filter);
    }
  }, [settings?.filter]);

  useEffect(() => {
    StorageAdapter.get<TodoItem[]>(STORAGE_KEYS.TODO_ITEMS, DEFAULT_TODOS).then(setTodos);
    StorageAdapter.get<HabitItem[]>(STORAGE_KEYS.HABIT_ITEMS, DEFAULT_HABITS).then(setHabits);
  }, []);

  const saveTodos = async (newTodos: TodoItem[]) => {
    setTodos(newTodos);
    await StorageAdapter.set(STORAGE_KEYS.TODO_ITEMS, newTodos);
  };

  const saveHabits = async (newHabits: HabitItem[]) => {
    setHabits(newHabits);
    await StorageAdapter.set(STORAGE_KEYS.HABIT_ITEMS, newHabits);
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    if (activeTab === 'todos') {
      const newItem: TodoItem = {
        id: Date.now().toString(),
        text: trimmed,
        completed: false,
        priority,
        createdAt: Date.now(),
      };
      saveTodos([newItem, ...todos]);
    } else {
      const newHabit: HabitItem = {
        id: Date.now().toString(),
        title: trimmed,
        history: {},
        createdAt: Date.now(),
      };
      saveHabits([...habits, newHabit]);
    }
    setInput('');
  };

  const toggleTodo = (id: string) => {
    saveTodos(
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  const toggleHabitDay = (habitId: string, dateStr: string) => {
    const updated = habits.map((h) => {
      if (h.id !== habitId) return h;
      const isDone = !!h.history[dateStr];
      const newHistory = { ...h.history };
      if (isDone) {
        delete newHistory[dateStr];
      } else {
        newHistory[dateStr] = true;
      }
      return { ...h, history: newHistory };
    });
    saveHabits(updated);
  };

  const deleteTodo = (id: string) => {
    saveTodos(todos.filter((t) => t.id !== id));
  };

  const deleteHabit = (id: string) => {
    saveHabits(habits.filter((h) => h.id !== id));
  };

  const clearCompleted = () => {
    saveTodos(todos.filter((t) => !t.completed));
  };

  const completedCount = todos.filter((t) => t.completed).length;

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
      {/* Главные вкладки: Задачи / Привычки */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div className="flex items-center gap-1 bg-surface/50 p-1 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => {
              setActiveTab('todos');
              onUpdateSettings?.({ defaultTab: 'todos' });
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'todos'
                ? 'bg-primary text-primary-fg shadow-1'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Задачи</span>
            <Badge variant="glass" className="ml-1 text-[10px]">
              {todos.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('habits');
              onUpdateSettings?.({ defaultTab: 'habits' });
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeTab === 'habits'
                ? 'bg-primary text-primary-fg shadow-1'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Привычки</span>
            <Badge variant="glass" className="ml-1 text-[10px]">
              {habits.length}
            </Badge>
          </button>
        </div>

        {activeTab === 'todos' && (
          <div className="flex items-center gap-2">
            <Badge variant="glass">
              {completedCount}/{todos.length}
            </Badge>
            {completedCount > 0 && (
              <button
                type="button"
                onClick={clearCompleted}
                title="Очистить завершенные"
                aria-label="Очистить завершенные задачи"
                className="text-xs text-fg-dim hover:text-danger transition-colors cursor-pointer p-1"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Индикатор прогресса выполнения задач */}
      {showProgress && activeTab === 'todos' && todos.length > 0 && (
        <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${Math.round((completedCount / todos.length) * 100)}%` }}
          />
        </div>
      )}

      {/* Форма добавления */}
      <form onSubmit={addTodo} className="flex items-center gap-2">
        <input
          type="text"
          aria-label={activeTab === 'todos' ? 'Новая задача' : 'Новая привычка'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={activeTab === 'todos' ? 'Новая задача...' : 'Новая привычка (напр. Чтение 20 мин)...'}
          className="flex-1 bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded-xl px-3 py-2 min-h-[38px] focus-visible:outline-none focus-visible:border-primary"
        />

        {activeTab === 'todos' && (
          <>
            <label htmlFor={prioritySelectId} className="sr-only">Приоритет задачи</label>
            <select
              id={prioritySelectId}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TodoPriority)}
              className="bg-surface text-xs text-fg border border-line rounded-xl px-2 py-2 min-h-[38px] focus-visible:outline-none cursor-pointer"
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>
          </>
        )}

        <Button
          size="sm"
          variant="primary"
          type="submit"
          aria-label="Добавить"
          disabled={!input.trim()}
          icon={<Plus className="w-4 h-4" />}
          className="min-h-[38px] min-w-[38px]"
        />
      </form>

      {/* Контент: Список задач */}
      {activeTab === 'todos' ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {filteredTodos.length === 0 ? (
              <EmptyState
                title="Все сделано!"
                description="Нет задач в выбранной категории"
              />
            ) : (
              filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="group flex items-center justify-between p-2 rounded-xl bg-surface/60 hover:bg-surface border border-line hover:border-line-hover transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleTodo(todo.id)}
                    aria-label={`Отметить задачу: ${todo.text}`}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <Circle className={cn('w-4 h-4 shrink-0', priorityColorClass[todo.priority])} />
                    )}
                    <span
                      className={cn(
                        'text-xs font-medium truncate',
                        todo.completed ? 'text-fg-muted line-through' : 'text-fg',
                      )}
                    >
                      {todo.text}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={`Удалить задачу: ${todo.text}`}
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-fg-dim hover:text-danger rounded transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Фильтры внизу */}
          <div className="flex items-center justify-center gap-1 pt-2 border-t border-line text-xs">
            {(['all', 'active', 'completed'] as TodoFilter[]).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => {
                  setActiveFilter(filterKey);
                  onUpdateSettings?.({ filter: filterKey });
                }}
                className={cn(
                  'px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer',
                  activeFilter === filterKey
                    ? 'bg-surface text-primary font-semibold'
                    : 'text-fg-muted hover:text-fg',
                )}
              >
                {filterKey === 'all' && 'Все'}
                {filterKey === 'active' && 'Активные'}
                {filterKey === 'completed' && 'Завершенные'}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Контент: Трекер привычек */
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {habits.length === 0 ? (
            <EmptyState
              title="Нет привычек"
              description="Добавьте полезную привычку, чтобы отслеживать стрик"
            />
          ) : (
            habits.map((habit) => {
              const streak = calculateStreak(habit.history);
              return (
                <div
                  key={habit.id}
                  className="group flex flex-col p-2 rounded-xl bg-surface/60 hover:bg-surface border border-line transition-all gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-fg truncate">
                        {habit.title}
                      </span>
                      {streak > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                          <Flame className="w-3 h-3 text-warning shrink-0" />
                          {streak} дн
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label={`Удалить привычку: ${habit.title}`}
                      onClick={() => deleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-fg-dim hover:text-danger rounded transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Матрица 7 дней недели */}
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day) => {
                      const isDone = !!habit.history[day.dateStr];
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => toggleHabitDay(habit.id, day.dateStr)}
                          title={`${day.label} (${day.dateStr})`}
                          aria-label={`Отметить ${day.label} для ${habit.title}`}
                          className={cn(
                            'flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer border',
                            isDone
                              ? 'bg-primary text-primary-fg border-primary shadow-1'
                              : day.isToday
                                ? 'bg-surface text-fg border-primary/50'
                                : 'bg-surface text-fg-muted border-line hover:border-line-hover',
                          )}
                        >
                          <span>{day.label}</span>
                          <span className="text-[8px] mt-0.5 font-normal opacity-80">
                            {isDone ? '✓' : '•'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
