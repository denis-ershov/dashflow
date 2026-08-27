import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslation } from '@/core/i18n';
import { WidgetRegistry } from '@/core/widget/registry';
import { Search, Plus, Settings, Palette, ShoppingBag, Edit3, Check } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { t } = useTranslation();
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setActiveModal,
    addWidget,
    isEditMode,
    setEditMode,
  } = useDashboardStore();
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

  const allWidgets = WidgetRegistry.getAll();

  const baseCommands = [
    {
      id: 'open-settings',
      title: 'Открыть Настройки',
      icon: <Settings className="w-4 h-4 text-fg-muted" />,
      action: () => {
        setActiveModal('settings');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'open-themes',
      title: 'Открыть Темы оформления',
      icon: <Palette className="w-4 h-4 text-primary" />,
      action: () => {
        setActiveModal('themes');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'open-marketplace',
      title: 'Открыть Каталог виджетов',
      icon: <ShoppingBag className="w-4 h-4 text-secondary" />,
      action: () => {
        setActiveModal('marketplace');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'toggle-edit-mode',
      title: isEditMode ? 'Завершить редактирование сетки' : 'Включить режим редактирования сетки',
      icon: isEditMode ? <Check className="w-4 h-4 text-success" /> : <Edit3 className="w-4 h-4 text-warning" />,
      action: () => {
        setEditMode(!isEditMode);
        setCommandPaletteOpen(false);
      },
    },
  ];

  const widgetCommands = allWidgets.map((w) => {
    const title = w.nameKey ? t(w.nameKey) : w.name || w.id;
    return {
      id: `add-${w.id}`,
      title: `Добавить виджет: ${title}`,
      icon: <Plus className="w-4 h-4 text-primary" />,
      action: () => {
        addWidget(w.id, w.size.defaultW, w.size.defaultH);
        setCommandPaletteOpen(false);
      },
    };
  });

  const allCommands = [...baseCommands, ...widgetCommands];

  const filteredCommands = allCommands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-20 p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-canvas/70 backdrop-blur-sm transition-opacity duration-fast"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-surface border border-line rounded-xl shadow-2xl overflow-hidden z-10 duration-fast">
        <div className="flex items-center px-4 py-3 border-b border-line">
          <Search className="w-5 h-5 text-fg-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите команду или название виджета..."
            className="w-full bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-xs text-fg-muted bg-surface/50 border border-line rounded font-mono">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-xs text-fg-muted">
              Ничего не найдено
            </div>
          ) : (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-fg hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {cmd.icon}
                  <span>{cmd.title}</span>
                </div>
                <span className="text-[10px] text-fg-muted font-mono">Выполнить</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
