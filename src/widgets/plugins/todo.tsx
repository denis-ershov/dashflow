import { useState, useEffect, useCallback, useRef } from 'react';
import { registerWidget } from '../registry';
import { createStore } from '@/storage/idb';
import type { WidgetDefinition, WidgetComponentProps, WidgetSettingsProps } from '../types';

// =============================================================================
// DATA MODEL
// =============================================================================

interface TodoConfig {
  showCompleted?: boolean;
  showClearCompleted?: boolean;
}

interface TodoItem {
  id: string;
  instanceId: string;
  text: string;
  done: boolean;
  order: number;
  createdAt?: number; // Optional for backward compat with existing records
}

const todoStore = createStore<TodoItem>('todo');

// =============================================================================
// UI COMPONENT
// =============================================================================

function TodoComponent({ instanceId, config }: WidgetComponentProps<TodoConfig>) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const showCompleted = config.showCompleted ?? true;
  const showClearCompleted = config.showClearCompleted ?? true;

  const load = useCallback(async () => {
    const list = await todoStore.getByIndex('instanceId', instanceId);
    const normalized = list.map((i) => ({ ...i, createdAt: i.createdAt ?? i.order }));
    setItems(normalized.sort((a, b) => a.order - b.order));
  }, [instanceId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const add = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    const item: TodoItem = {
      id: crypto.randomUUID(),
      instanceId,
      text,
      done: false,
      order: items.length,
      createdAt: Date.now(),
    };
    await todoStore.create(item);
    setItems((prev) => [...prev, item].sort((a, b) => a.order - b.order));
    setInput('');
  }, [instanceId, items.length]);

  const toggle = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const updated = { ...item, done: !item.done };
    await todoStore.update(updated);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, [items]);

  const update = useCallback(async (id: string, text: string) => {
    const trimmed = text.trim();
    setEditingId(null);
    setEditText('');
    if (!trimmed) {
      await remove(id);
      return;
    }
    const item = items.find((i) => i.id === id);
    if (!item || item.text === trimmed) return;
    const updated = { ...item, text: trimmed };
    await todoStore.update(updated);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, [items]);

  const remove = useCallback(async (id: string) => {
    await todoStore.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const reorder = useCallback(async (fromId: string, toId: string) => {
    const fromIdx = items.findIndex((i) => i.id === fromId);
    const toIdx = items.findIndex((i) => i.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

    const reordered = [...items];
    const [removed] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, removed);

    const updates = reordered.map((item, idx) => ({ ...item, order: idx }));
    await todoStore.updateMany(updates);
    setItems(updates);
    setDraggedId(null);
    setDragOverId(null);
  }, [items]);

  const clearCompleted = useCallback(async () => {
    const toRemove = items.filter((i) => i.done);
    for (const item of toRemove) {
      await todoStore.delete(item.id);
    }
    const remaining = items.filter((i) => !i.done).map((item, idx) => ({ ...item, order: idx }));
    await todoStore.updateMany(remaining);
    setItems(remaining);
  }, [items]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'todo', id }));
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== id) setDragOverId(id);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (e: React.DragEvent, toId: string) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain');
    if (fromId && fromId !== toId) reorder(fromId, toId);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const startEdit = (item: TodoItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const visibleItems = showCompleted ? items : items.filter((i) => !i.done);
  const completedCount = items.filter((i) => i.done).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2 mb-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add task…"
          className="flex-1 px-2 py-1.5 text-sm rounded bg-slate-800/50 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
        />
        <button
          type="submit"
          className="px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-200 shrink-0"
        >
          Add
        </button>
      </form>

      <ul className="flex-1 overflow-auto space-y-1 min-h-0">
        {visibleItems.map((item) => (
          <li
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item.id)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-2 group text-sm rounded px-2 py-1.5 -mx-1
              cursor-grab active:cursor-grabbing
              ${draggedId === item.id ? 'opacity-50' : ''}
              ${dragOverId === item.id ? 'ring-1 ring-slate-500 bg-slate-800/80' : ''}
            `}
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item.id)}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-slate-600 bg-slate-800 text-slate-400 shrink-0"
            />
            {editingId === item.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => update(item.id, editText)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') update(item.id, editText);
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setEditText('');
                  }
                }}
                className="flex-1 px-1 py-0.5 text-sm rounded bg-slate-800 border border-slate-600 text-slate-200 focus:outline-none focus:border-slate-500"
              />
            ) : (
              <span
                onClick={() => startEdit(item)}
                className={`flex-1 truncate cursor-text select-text ${item.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}
              >
                {item.text}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 text-xs shrink-0"
              aria-label="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {showClearCompleted && completedCount > 0 && (
        <button
          type="button"
          onClick={clearCompleted}
          className="mt-2 text-xs text-slate-500 hover:text-slate-400 self-start"
        >
          Clear {completedCount} completed
        </button>
      )}
    </div>
  );
}

// =============================================================================
// WIDGET SETTINGS
// =============================================================================

function TodoSettingsPanel({
  instanceId,
  config,
  onConfigChange,
}: WidgetSettingsProps<TodoConfig>) {
  return (
    <div className="space-y-3 p-3 text-sm">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showCompleted ?? true}
          onChange={(e) => onConfigChange({ showCompleted: e.target.checked })}
          className="rounded border-slate-600 bg-slate-800 text-slate-400"
        />
        Show completed tasks
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.showClearCompleted ?? true}
          onChange={(e) => onConfigChange({ showClearCompleted: e.target.checked })}
          className="rounded border-slate-600 bg-slate-800 text-slate-400"
        />
        Show "Clear completed" button
      </label>
    </div>
  );
}

// =============================================================================
// REGISTRATION
// =============================================================================

const todoDefinition: WidgetDefinition<TodoConfig> = {
  metadata: {
    type: 'todo',
    name: 'To-Do',
    description: 'Manage tasks with add, edit, delete, and drag-to-reorder',
  },
  component: TodoComponent,
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  SettingsPanel: TodoSettingsPanel,
  defaultConfig: { showCompleted: true, showClearCompleted: true },
};

registerWidget(todoDefinition);
