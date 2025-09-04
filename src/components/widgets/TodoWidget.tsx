import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Check, 
  X, 
  Edit3, 
  Calendar, 
  Flag, 
  Filter,
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { WidgetConfig, TodoItem } from '../../types/widget';

interface TodoWidgetProps {
  config: WidgetConfig;
}

const TodoWidget: React.FC<TodoWidgetProps> = ({ config }) => {
  const { t } = useTranslation(['common', 'widgets']);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Инициализация с демо-данными
  useEffect(() => {
    const demoTodos: TodoItem[] = [
      {
        id: '1',
        title: 'Купить продукты',
        description: 'Молоко, хлеб, яблоки',
        completed: false,
        priority: 'medium',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // завтра
        category: 'personal',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        title: 'Закончить презентацию',
        description: 'Подготовить слайды для встречи с клиентом',
        completed: false,
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // через 2 часа
        category: 'work',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        title: 'Прочитать книгу',
        completed: true,
        priority: 'low',
        category: 'personal',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '4',
        title: 'Оплатить счета',
        completed: false,
        priority: 'high',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // вчера (просрочено)
        category: 'personal',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    setTodos(demoTodos);
  }, []);

  const addTodo = (title: string) => {
    if (!title.trim()) return;

    const newTodoItem: TodoItem = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      priority: 'medium',
      category: config.settings?.defaultCategory || 'personal',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTodos(prev => [newTodoItem, ...prev]);
    setNewTodo('');
    setShowAddForm(false);
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed, updatedAt: new Date() }
        : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id 
        ? { ...todo, ...updates, updatedAt: new Date() }
        : todo
    ));
  };

  const getPriorityColor = (priority: TodoItem['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-light-shadow dark:text-dark-light/70';
    }
  };

  const getPriorityIcon = (priority: TodoItem['priority']) => {
    switch (priority) {
      case 'high': return <AlertTriangle size={14} />;
      case 'medium': return <Flag size={14} />;
      case 'low': return <Circle size={14} />;
      default: return null;
    }
  };

  const isOverdue = (todo: TodoItem) => {
    return todo.dueDate && !todo.completed && new Date() > todo.dueDate;
  };

  const filteredTodos = todos.filter(todo => {
    // Фильтр по статусу
    switch (filter) {
      case 'active':
        if (todo.completed) return false;
        break;
      case 'completed':
        if (!todo.completed) return false;
        break;
      case 'overdue':
        if (!isOverdue(todo)) return false;
        break;
    }

    // Фильтр по категории
    if (selectedCategory !== 'all' && todo.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  const categories = ['all', ...Array.from(new Set(todos.map(todo => todo.category)))];
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    overdue: todos.filter(t => isOverdue(t)).length
  };

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="p-2 bg-light-bg dark:bg-dark-bg rounded">
          <div className="font-medium text-light-text dark:text-dark-light">{stats.total}</div>
          <div className="text-xs text-light-shadow dark:text-dark-light/70">Всего</div>
        </div>
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
          <div className="font-medium text-green-600 dark:text-green-400">{stats.completed}</div>
          <div className="text-xs text-green-600/70 dark:text-green-400/70">Выполнено</div>
        </div>
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
          <div className="font-medium text-red-600 dark:text-red-400">{stats.overdue}</div>
          <div className="text-xs text-red-600/70 dark:text-red-400/70">Просрочено</div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex items-center justify-between">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="text-xs bg-light-bg dark:bg-dark-bg border border-light-shadow/30 dark:border-dark-accent/30 rounded px-2 py-1"
        >
          <option value="all">Все задачи</option>
          <option value="active">Активные</option>
          <option value="completed">Выполненные</option>
          <option value="overdue">Просроченные</option>
        </select>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-xs px-3 py-1"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="space-y-2 p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-shadow/20 dark:border-dark-accent/20">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo(newTodo)}
            placeholder={t('widgets:todo.taskTitle')}
            className="input-field text-sm"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="text-xs px-2 py-1 text-light-shadow dark:text-dark-light/70 hover:bg-light-shadow/20 dark:hover:bg-dark-accent/20 rounded"
            >
              {t('cancel')}
            </button>
            <button
              onClick={() => addTodo(newTodo)}
              className="btn-primary text-xs px-2 py-1"
            >
              {t('add')}
            </button>
          </div>
        </div>
      )}

      {/* Список задач */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-4 text-light-shadow dark:text-dark-light/70 text-sm">
            {filter === 'all' ? 'Нет задач' : `Нет ${filter === 'active' ? 'активных' : filter === 'completed' ? 'выполненных' : 'просроченных'} задач`}
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div
              key={todo.id}
              className={`flex items-start space-x-3 p-2 rounded-lg border transition-colors ${
                todo.completed 
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30' 
                  : isOverdue(todo)
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                  : 'bg-light-bg dark:bg-dark-bg border-light-shadow/20 dark:border-dark-accent/20'
              }`}
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className="mt-1 flex-shrink-0"
              >
                {todo.completed ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <Circle size={16} className="text-light-shadow dark:text-dark-light/50" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className={`text-sm ${todo.completed ? 'line-through text-light-shadow dark:text-dark-light/50' : 'text-light-text dark:text-dark-light'}`}>
                  {todo.title}
                </div>
                
                {todo.description && (
                  <div className="text-xs text-light-shadow dark:text-dark-light/70 mt-1">
                    {todo.description}
                  </div>
                )}

                <div className="flex items-center space-x-2 mt-1">
                  <div className={`flex items-center space-x-1 ${getPriorityColor(todo.priority)}`}>
                    {getPriorityIcon(todo.priority)}
                    <span className="text-xs">{t(`widgets:todo.${todo.priority}`)}</span>
                  </div>

                  {todo.dueDate && (
                    <div className={`flex items-center space-x-1 text-xs ${isOverdue(todo) ? 'text-red-500' : 'text-light-shadow dark:text-dark-light/70'}`}>
                      <Clock size={12} />
                      <span>
                        {todo.dueDate.toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <span className="text-xs bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent px-1 rounded">
                    {t(`widgets:todo.${todo.category}`)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => deleteTodo(todo.id)}
                className="flex-shrink-0 p-1 hover:bg-red-500/20 rounded transition-colors"
              >
                <X size={14} className="text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TodoWidget;