export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoFilter = 'all' | 'active' | 'completed';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: TodoPriority;
  createdAt?: number;
}

export interface TodoSettings {
  filter?: TodoFilter;
  defaultPriority?: TodoPriority;
}
