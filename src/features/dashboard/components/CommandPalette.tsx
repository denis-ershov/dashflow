import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslation } from '@/core/i18n';
import { WidgetRegistry } from '@/core/widget/registry';
import { useThemeStore } from '@/core/theme/themeStore';
import { PRESETS } from '@/core/theme/presets';
import {
  Search,
  Plus,
  Settings,
  Palette,
  ShoppingBag,
  Sparkles,
  LayoutGrid,
  Globe,
} from 'lucide-react';
import { cn } from '@/ui/lib/cn';

export const CommandPalette: React.FC = () => {
  const { t } = useTranslation();
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setActiveModal,
    addWidget,
    layoutMode,
    setLayoutMode,
  } = useDashboardStore();
  const { setPreset } = useThemeStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Сброс индекса при изменении запроса
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isCommandPaletteOpen) return null;

  const allWidgets = WidgetRegistry.getAll();

  const baseCommands = [
    {
      id: 'toggle-layout-mode',
      title: layoutMode === 'zen' ? 'Включить режим Dashboard (виджеты)' : 'Включить режим Zen (фокус)',
      category: 'Режим',
      icon: layoutMode === 'zen' ? <LayoutGrid className="w-4 h-4 text-primary" /> : <Sparkles className="w-4 h-4 text-accent" />,
      action: () => {
        setLayoutMode(layoutMode === 'zen' ? 'modular' : 'zen');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'open-settings',
      title: 'Открыть Настройки',
      category: 'Навигация',
      icon: <Settings className="w-4 h-4 text-fg-muted" />,
      action: () => {
        setActiveModal('settings');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'open-themes',
      title: 'Открыть Темы оформления и обои',
      category: 'Оформление',
      icon: <Palette className="w-4 h-4 text-primary" />,
      action: () => {
        setActiveModal('appearance');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'open-marketplace',
      title: 'Открыть Каталог плагинов',
      category: 'Плагины',
      icon: <ShoppingBag className="w-4 h-4 text-secondary" />,
      action: () => {
        setActiveModal('marketplace');
        setCommandPaletteOpen(false);
      },
    },
  ];

  // Команды переключения тем
  const themeCommands = PRESETS.map((p) => ({
    id: `theme-${p.id}`,
    title: `Тема: ${p.id}`,
    category: 'Темы',
    icon: <Palette className="w-4 h-4 text-primary" />,
    action: () => {
      setPreset(p.id);
      setCommandPaletteOpen(false);
    },
  }));

  // Команды добавления виджетов
  const widgetCommands = allWidgets.map((w) => {
    const title = w.nameKey ? t(w.nameKey) : w.name || w.id;
    return {
      id: `add-${w.id}`,
      title: `Добавить виджет: ${title}`,
      category: 'Виджеты',
      icon: <Plus className="w-4 h-4 text-primary" />,
      action: () => {
        addWidget(w.id, w.size.defaultW, w.size.defaultH);
        setCommandPaletteOpen(false);
      },
    };
  });

  const allCommands = [...baseCommands, ...themeCommands, ...widgetCommands];

  const filteredCommands = allCommands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase()),
  );

  // Клавиатурная навигация внутри палитры
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      } else if (query.trim()) {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Командная палитра"
      className="fixed inset-0 z-[var(--z-modal,50)] flex items-start justify-center pt-20 p-4 select-none"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-canvas/80 backdrop-blur-md transition-opacity duration-fast"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl glass-panel border border-line rounded-2xl shadow-3 overflow-hidden z-[var(--z-modal,50)] duration-fast">
        <div className="flex items-center px-4 py-3 border-b border-line bg-surface">
          <Search className="w-5 h-5 text-fg-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Введите команду, тему, виджет или поисковый запрос..."
            className="w-full bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none min-h-[36px]"
          />
          <kbd className="px-2 py-1 text-xs text-fg-muted bg-surface border border-line rounded-md font-mono select-none">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-xs text-fg-muted flex flex-col items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <span>Нажмите Enter, чтобы искать «{query}» в Google</span>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                type="button"
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer min-h-[40px]',
                  selectedIndex === idx
                    ? 'bg-primary text-primary-fg shadow-1'
                    : 'text-fg hover:bg-surface-hover',
                )}
              >
                <div className="flex items-center gap-3">
                  {cmd.icon}
                  <span>{cmd.title}</span>
                </div>
                <span className={cn('text-xs font-mono', selectedIndex === idx ? 'text-primary-fg' : 'text-fg-dim')}>
                  {cmd.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
