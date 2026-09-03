export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoFilter = 'all' | 'active' | 'completed';
export type TodoTab = 'todos' | 'habits';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: TodoPriority;
  createdAt?: number;
}

export interface HabitItem {
  id: string;
  title: string;
  /** История выполнения в формате 'YYYY-MM-DD': boolean */
  history: Record<string, boolean>;
  createdAt?: number;
}

export type TodoSortBy = 'date' | 'priority' | 'text';
export type TodoDensity = 'compact' | 'comfortable';

export interface TodoSettings {
  filter?: TodoFilter;
  defaultPriority?: TodoPriority;
  defaultTab?: TodoTab;
  showProgress?: boolean;
  sortBy?: TodoSortBy;
  hideCompleted?: boolean;
  density?: TodoDensity;
}
