import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Search, Plus, Settings, Palette, Clock, CloudSun, CheckSquare, FileText, Bookmark } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen, setActiveModal, addWidget } = useDashboardStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands = [
    {
      id: 'add-clock',
      title: 'Добавить виджет: Часы',
      icon: <Clock className="w-4 h-4 text-blue-400" />,
      action: () => {
        addWidget('clock', 4, 2);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'add-weather',
      title: 'Добавить виджет: Погода',
      icon: <CloudSun className="w-4 h-4 text-amber-400" />,
      action: () => {
        addWidget('weather', 4, 2);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'add-todo',
      title: 'Добавить виджет: Задачи',
      icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
      action: () => {
        addWidget('todo', 6, 4);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'add-notes',
      title: 'Добавить виджет: Заметки',
      icon: <FileText className="w-4 h-4 text-purple-400" />,
      action: () => {
        addWidget('notes', 6, 4);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'open-settings',
      title: 'Открыть Настройки',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      action: () => {
        setActiveModal('settings');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'open-themes',
      title: 'Открыть Темы',
      icon: <Palette className="w-4 h-4 text-pink-400" />,
      action: () => {
        setActiveModal('themes');
        setCommandPaletteOpen(false);
      },
    },
  ];

  const filteredCommands = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3 border-b border-[var(--color-border)]">
          <Search className="w-5 h-5 text-[var(--color-text-muted)] mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите команду или поиск виджета..."
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md font-mono">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
              Ничего не найдено
            </div>
          ) : (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  {cmd.icon}
                  <span>{cmd.title}</span>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">Выполнить</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
