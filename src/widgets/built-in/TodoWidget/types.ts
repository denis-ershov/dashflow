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

export interface TodoSettings {
  filter?: TodoFilter;
  defaultPriority?: TodoPriority;
  defaultTab?: TodoTab;
}
