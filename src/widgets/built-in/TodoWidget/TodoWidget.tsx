import React, { useState, useEffect, useId } from 'react';
import { t, useI18nStore, useTranslation, type SupportedLanguage } from '@/core/i18n';
import { Plus, Trash2, CheckCircle2, Circle, CheckCheck, Flame, Calendar, CheckSquare } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { Button, Badge } from '@/ui/primitives';
import { EmptyState } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { TodoItem, TodoPriority, TodoFilter, TodoSettings, HabitItem, TodoTab } from './types';
import { runLogged } from '@/core/observability';
import { toLocalDateKey } from '@/core/datetime';

/**
 * Стартовые задачи и привычки становятся данными пользователя при первом запуске,
 * поэтому создаются на языке интерфейса в этот момент.
 */
const createDefaultTodos = (lang: SupportedLanguage): TodoItem[] => [
  { id: '1', text: t('todo.seed.install', undefined, lang), completed: true, priority: 'high' },
  { id: '2', text: t('todo.seed.setup', undefined, lang), completed: false, priority: 'medium' },
];

const createDefaultHabits = (lang: SupportedLanguage): HabitItem[] => [
  { id: '1', title: t('todo.seed.water', undefined, lang), history: {} },
  { id: '2', title: t('todo.seed.reading', undefined, lang), history: {} },
  { id: '3', title: t('todo.seed.exercise', undefined, lang), history: {} },
];

const getDaysOfWeek = (lang: SupportedLanguage) => {
  const now = new Date();
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);

  const days: { dateStr: string; label: string; isToday: boolean }[] = [];
  const weekdayFormat = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
  const todayStr = toLocalDateKey(now);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = toLocalDateKey(d);
    days.push({
      dateStr,
      label: weekdayFormat.format(d),
      isToday: dateStr === todayStr,
    });
  }
  return days;
};

const calculateStreak = (history: Record<string, boolean>) => {
  let streak = 0;
  const d = new Date();
  while (true) {
    const dateStr = toLocalDateKey(d);
    if (history[dateStr]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      if (streak === 0) {
        d.setDate(d.getDate() - 1);
        const yStr = toLocalDateKey(d);
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

export const TodoWidget: React.FC<WidgetProps<TodoSettings>> = ({
  instanceId,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TodoTab>(settings?.defaultTab || 'todos');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<TodoPriority>(settings?.defaultPriority || 'medium');
  const [activeFilter, setActiveFilter] = useState<TodoFilter>(settings?.filter || 'all');
  const showProgress = settings?.showProgress !== false;
  const prioritySelectId = useId();

  const { t: tr, tp, language } = useTranslation();
  const weekDays = getDaysOfWeek(language);

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

  const todoKey = instanceId ? `${STORAGE_KEYS.TODO_ITEMS}_${instanceId}` : STORAGE_KEYS.TODO_ITEMS;
  const habitKey = instanceId ? `${STORAGE_KEYS.HABIT_ITEMS}_${instanceId}` : STORAGE_KEYS.HABIT_ITEMS;

  useEffect(() => {
    let cancelled = false;
    const language = useI18nStore.getState().language;

    // Копия экземпляра важнее общего ключа: общий — запасной вариант для нового виджета
    const loadItems = async () => {
      const [baseTodos, baseHabits] = await Promise.all([
        StorageAdapter.get<TodoItem[]>(STORAGE_KEYS.TODO_ITEMS, createDefaultTodos(language)),
        StorageAdapter.get<HabitItem[]>(STORAGE_KEYS.HABIT_ITEMS, createDefaultHabits(language)),
      ]);
      const [scopedTodos, scopedHabits] = await Promise.all([
        todoKey !== STORAGE_KEYS.TODO_ITEMS ? StorageAdapter.get<TodoItem[]>(todoKey, []) : [],
        habitKey !== STORAGE_KEYS.HABIT_ITEMS ? StorageAdapter.get<HabitItem[]>(habitKey, []) : [],
      ]);
      if (cancelled) return;
      setTodos(scopedTodos.length > 0 ? scopedTodos : baseTodos);
      setHabits(scopedHabits.length > 0 ? scopedHabits : baseHabits);
    };
    runLogged(loadItems(), 'storage', { widget: 'todo' });

    return () => {
      cancelled = true;
    };
  }, [todoKey, habitKey]);

  const persist = async (baseKey: string, scopedKey: string, value: unknown) => {
    await StorageAdapter.set(baseKey, value);
    if (scopedKey !== baseKey) {
      await StorageAdapter.set(scopedKey, value);
    }
  };

  const saveTodos = (newTodos: TodoItem[]) => {
    setTodos(newTodos);
    runLogged(persist(STORAGE_KEYS.TODO_ITEMS, todoKey, newTodos), 'storage', { widget: 'todo' });
  };

  const saveHabits = (newHabits: HabitItem[]) => {
    setHabits(newHabits);
    runLogged(persist(STORAGE_KEYS.HABIT_ITEMS, habitKey, newHabits), 'storage', {
      widget: 'todo',
    });
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

  const sortBy = settings?.sortBy || 'date';
  const hideCompleted = Boolean(settings?.hideCompleted);
  const density = settings?.density || 'comfortable';

  let filteredTodos = todos.filter((todo) => {
    if (hideCompleted && todo.completed) return false;
    if (activeFilter === 'active') return !todo.completed;
    if (activeFilter === 'completed') return todo.completed;
    return true;
  });

  filteredTodos = [...filteredTodos].sort((a, b) => {
    if (sortBy === 'priority') {
      const pMap = { high: 3, medium: 2, low: 1 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    }
    if (sortBy === 'text') {
      return a.text.localeCompare(b.text);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
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
            <span>{tr('todo.tabs.todos')}</span>
            <Badge variant="glass" className="ml-1 text-2xs">
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
            <span>{tr('todo.tabs.habits')}</span>
            <Badge variant="glass" className="ml-1 text-2xs">
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
                title={tr('todo.clearCompleted')}
                aria-label={tr('todo.clearCompletedLabel')}
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
          aria-label={activeTab === 'todos' ? tr('todo.newTask') : tr('todo.newHabit')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            activeTab === 'todos' ? tr('todo.newTaskPlaceholder') : tr('todo.newHabitPlaceholder')
          }
          className="flex-1 bg-surface text-xs placeholder:text-fg-muted border border-line rounded-xl px-3 py-2 min-h-9.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />

        {activeTab === 'todos' && (
          <>
            <label htmlFor={prioritySelectId} className="sr-only">{tr('todo.priority')}</label>
            <select
              id={prioritySelectId}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TodoPriority)}
              className="bg-surface text-xs border border-line rounded-xl px-2 py-2 min-h-9.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            >
              <option value="low">{tr('todo.priorities.low')}</option>
              <option value="medium">{tr('todo.priorities.medium')}</option>
              <option value="high">{tr('todo.priorities.high')}</option>
            </select>
          </>
        )}

        <Button
          size="sm"
          variant="primary"
          type="submit"
          aria-label={tr('todo.add')}
          disabled={!input.trim()}
          icon={<Plus className="w-4 h-4" />}
          className="min-h-9.5 min-w-9.5"
        />
      </form>

      {/* Контент: Список задач */}
      {activeTab === 'todos' ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {filteredTodos.length === 0 ? (
              <EmptyState
                title={tr('todo.allDone')}
                description={tr('todo.allDoneHint')}
              />
            ) : (
              filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    'group flex items-center justify-between bg-surface/60 hover:bg-surface border border-line hover:border-line-hover transition-all',
                    density === 'compact' ? 'py-1.5 px-2.5 rounded-lg' : 'p-2.5 rounded-xl',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleTodo(todo.id)}
                    aria-label={tr('todo.toggleTask', { text: todo.text })}
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
                    aria-label={tr('todo.deleteTask', { text: todo.text })}
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
                {tr(`todo.filters.${filterKey}`)}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Контент: Трекер привычек */
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {habits.length === 0 ? (
            <EmptyState
              title={tr('todo.noHabits')}
              description={tr('todo.noHabitsHint')}
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
                        <span className="flex items-center gap-1 text-2xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                          <Flame className="w-3 h-3 text-warning shrink-0" />
                          {tp('todo.streak', streak)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label={tr('todo.deleteHabit', { title: habit.title })}
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
                          aria-label={tr('todo.markDay', { day: day.label, title: habit.title })}
                          className={cn(
                            'flex flex-col items-center justify-center py-1 rounded-lg text-2xs font-semibold transition-all cursor-pointer border',
                            isDone
                              ? 'bg-primary text-primary-fg border-primary shadow-1'
                              : day.isToday
                                ? 'bg-surface text-fg border-primary/50'
                                : 'bg-surface text-fg-muted border-line hover:border-line-hover',
                          )}
                        >
                          <span>{day.label}</span>
                          <span className="text-2xs mt-0.5 font-normal opacity-80">
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
