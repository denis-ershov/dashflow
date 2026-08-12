import React from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAppStore } from '@/stores/useAppStore';
import { getTranslation } from '@/services/localization/i18n';
import {
  Plus,
  Search,
  Settings,
  Palette,
  ShoppingBag,
  Edit3,
  Lock,
  Unlock,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

export const FloatingToolbar: React.FC = () => {
  const { language } = useAppStore();
  const {
    isEditMode,
    isLocked,
    setEditMode,
    setLocked,
    setCommandPaletteOpen,
    setActiveModal,
  } = useDashboardStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--color-border)] shadow-2xl transition-all duration-300 hover:border-[var(--color-primary)]">
      {/* Кнопка Добавить виджет */}
      <Tooltip content={getTranslation(language, 'toolbar.addWidget')}>
        <button
          onClick={() => setActiveModal('addWidget')}
          className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-primary-hover)] transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{getTranslation(language, 'toolbar.addWidget')}</span>
        </button>
      </Tooltip>

      <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

      {/* Кнопка Поиск / Command Palette */}
      <Tooltip content={getTranslation(language, 'toolbar.search')}>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Кнопка Темы */}
      <Tooltip content={getTranslation(language, 'toolbar.themes')}>
        <button
          onClick={() => setActiveModal('themes')}
          className="p-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          <Palette className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Кнопка Marketplace */}
      <Tooltip content="Магазин виджетов">
        <button
          onClick={() => setActiveModal('marketplace')}
          className="p-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
        </button>
      </Tooltip>

      {/* Кнопка Редактировать Сетку */}
      <Tooltip content={isEditMode ? 'Завершить редактирование' : getTranslation(language, 'toolbar.editLayout')}>
        <button
          disabled={isLocked}
          onClick={() => setEditMode(!isEditMode)}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            isEditMode
              ? 'bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] border border-[var(--color-secondary)]/40'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
          } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* Кнопка Фиксации сетки */}
      <Tooltip content={isLocked ? 'Разблокировать сетку' : getTranslation(language, 'toolbar.lockLayout')}>
        <button
          onClick={() => setLocked(!isLocked)}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            isLocked
              ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
          }`}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
      </Tooltip>

      <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

      {/* Кнопка Настройки */}
      <Tooltip content={getTranslation(language, 'toolbar.settings')}>
        <button
          onClick={() => setActiveModal('settings')}
          className="p-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
};
