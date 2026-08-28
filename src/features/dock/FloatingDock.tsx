import React from 'react';
import { cn } from '@/ui/lib/cn';
import {
  LayoutGrid,
  Sparkles,
  Plus,
  Palette,
  Volume2,
  Settings,
  Search,
  Lock,
  Unlock,
} from 'lucide-react';
import { Tooltip } from '@/ui/primitives';

export interface FloatingDockProps {
  layoutMode: 'zen' | 'modular' | 'canvas';
  onToggleLayoutMode: () => void;
  onOpenAddWidget: () => void;
  onOpenAppearance: () => void;
  onOpenAudio: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  isAudioPlaying?: boolean;
  className?: string;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  layoutMode,
  onToggleLayoutMode,
  onOpenAddWidget,
  onOpenAppearance,
  onOpenAudio,
  onOpenSettings,
  onOpenCommandPalette,
  isEditMode = false,
  onToggleEditMode,
  isAudioPlaying = false,
  className,
}) => {
  return (
    <nav
      aria-label="Панель быстрого управления"
      className={cn(
        'fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-rail,30)]',
        'glass-pill px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2 shadow-3 border border-line',
        'max-w-[calc(100vw-1.5rem)] duration-normal select-none overflow-x-auto no-scrollbar backdrop-blur-xl',
        className,
      )}
    >
      {/* Переключение Zen / Dashboard */}
      <Tooltip content={layoutMode === 'zen' ? 'Включить виджеты' : 'Режим Zen / Фокус'}>
        <button
          type="button"
          onClick={onToggleLayoutMode}
          aria-label={layoutMode === 'zen' ? 'Включить виджеты' : 'Режим Zen'}
          className={cn(
            'p-2 rounded-full transition-all min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer',
            layoutMode === 'zen'
              ? 'bg-primary text-primary-fg shadow-1 hover:bg-primary-hover'
              : 'text-fg-muted hover:text-fg hover:bg-surface-hover',
          )}
        >
          {layoutMode === 'zen' ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <LayoutGrid className="w-4 h-4" />
          )}
        </button>
      </Tooltip>

      <div className="w-px h-5 bg-line my-auto mx-1" />

      {/* Добавить виджет */}
      <Tooltip content="Добавить виджет">
        <button
          type="button"
          onClick={onOpenAddWidget}
          aria-label="Добавить виджет"
          className="p-2 rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-all min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer active:scale-90"
        >
          <Plus className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Командная строка Ctrl+K */}
      <Tooltip content="Командная палитра (Ctrl+K)">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Командная палитра"
          className="p-2 rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-all min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer active:scale-90"
        >
          <Search className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Темы и Обои */}
      <Tooltip content="Темы оформления и обои">
        <button
          type="button"
          onClick={onOpenAppearance}
          aria-label="Темы и обои"
          className="p-2 rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-all min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer active:scale-90"
        >
          <Palette className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Звуки природы */}
      <Tooltip content={isAudioPlaying ? 'Звуки природы (активны)' : 'Звуки природы'}>
        <button
          type="button"
          onClick={onOpenAudio}
          aria-label="Звуки природы"
          className={cn(
            'p-2 rounded-full transition-all min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer active:scale-90',
            isAudioPlaying
              ? 'text-primary bg-primary/15 shadow-[0_0_12px_var(--dashflow-primary-glow)]'
              : 'text-fg-muted hover:text-fg hover:bg-surface-hover',
          )}
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Режим редактирования сетки */}
      {onToggleEditMode && (layoutMode === 'modular' || layoutMode === 'canvas') && (
        <Tooltip content={isEditMode ? 'Завершить редактирование' : 'Редактировать сетку'}>
          <button
            type="button"
            onClick={onToggleEditMode}
            aria-label={isEditMode ? 'Завершить редактирование' : 'Редактировать сетку'}
            className={cn(
              'p-2 rounded-full transition-all min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer active:scale-90',
              isEditMode
                ? 'bg-warning/20 text-warning border border-warning/40'
                : 'text-fg-muted hover:text-fg hover:bg-surface-hover',
            )}
          >
            {isEditMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </button>
        </Tooltip>
      )}

      <div className="w-px h-5 bg-line my-auto mx-1" />

      {/* Настройки */}
      <Tooltip content="Настройки">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Настройки"
          className="p-2 rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-all min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer active:scale-90"
        >
          <Settings className="w-4 h-4" />
        </button>
      </Tooltip>
    </nav>
  );
};
