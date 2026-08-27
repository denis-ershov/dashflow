import React from 'react';
import {
  Plus,
  Search,
  Palette,
  ShoppingBag,
  Edit3,
  Check,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslation } from '@/core/i18n';
import { Tooltip } from '@/ui/primitives';
import { cn } from '@/ui/lib/cn';

export const NavRail: React.FC = () => {
  const { t } = useTranslation();
  const {
    isEditMode,
    setEditMode,
    setActiveModal,
    setCommandPaletteOpen,
  } = useDashboardStore();

  const handleToggleEdit = () => {
    setEditMode(!isEditMode);
  };

  return (
    <>
      {/* Десктопный вертикальный рельс (прижат к левому краю, >= 640px) */}
      <aside
        aria-label="Основная навигация"
        className="hidden sm:flex flex-col items-center justify-between fixed left-0 top-0 bottom-0 w-16 bg-surface/85 backdrop-blur-md border-r border-line z-30 py-4 select-none"
      >
        {/* Верхний логотип / бренд-иконка */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-primary-fg shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="w-8 h-px bg-line/60 my-1" />

          {/* Кнопка добавления виджета */}
          <Tooltip content={t('toolbar.addWidget')} position="right">
            <button
              type="button"
              aria-label="Добавить виджет"
              onClick={() => setActiveModal('addWidget')}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-fg hover:bg-primary/90 transition-transform active:scale-95 shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
            >
              <Plus className="w-5 h-5" />
            </button>
          </Tooltip>

          {/* Поиск / Command Palette */}
          <Tooltip content={`${t('toolbar.search')} (Ctrl+K)`} position="right">
            <button
              type="button"
              aria-label="Поиск"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
            >
              <Search className="w-5 h-5" />
            </button>
          </Tooltip>

          {/* Темы оформления */}
          <Tooltip content={t('toolbar.themes')} position="right">
            <button
              type="button"
              aria-label="Темы оформления"
              onClick={() => setActiveModal('themes')}
              className="flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
            >
              <Palette className="w-5 h-5" />
            </button>
          </Tooltip>

          {/* Каталог / Marketplace */}
          <Tooltip content={t('toolbar.marketplace')} position="right">
            <button
              type="button"
              aria-label="Каталог виджетов"
              onClick={() => setActiveModal('marketplace')}
              className="flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-secondary hover:bg-surface-hover transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
            >
              <ShoppingBag className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>

        {/* Нижние действия: Режим правки и Настройки */}
        <div className="flex flex-col items-center gap-2">
          {/* Переключатель режима редактирования */}
          <Tooltip
            content={isEditMode ? t('toolbar.saveLayout') : t('toolbar.editLayout')}
            position="right"
          >
            <button
              type="button"
              aria-label={isEditMode ? 'Завершить редактирование' : 'Редактировать сетку'}
              onClick={handleToggleEdit}
              className={cn(
                'flex items-center justify-center w-11 h-11 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none',
                isEditMode
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-hover',
              )}
            >
              {isEditMode ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </button>
          </Tooltip>

          {/* Настройки */}
          <Tooltip content={t('toolbar.settings')} position="right">
            <button
              type="button"
              aria-label="Настройки"
              onClick={() => setActiveModal('settings')}
              className="flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
            >
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Мобильная нижняя панель (< 640px, Mobile First, зоны 44x44 px) */}
      <nav
        aria-label="Мобильная навигация"
        className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-lg border-t border-line z-30 flex items-center justify-around px-2 select-none"
      >
        {/* Добавить */}
        <button
          type="button"
          aria-label="Добавить виджет"
          onClick={() => setActiveModal('addWidget')}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-primary-fg transition-transform active:scale-95 shadow-sm cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Поиск */}
        <button
          type="button"
          aria-label="Поиск"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Темы */}
        <button
          type="button"
          aria-label="Темы оформления"
          onClick={() => setActiveModal('themes')}
          className="flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <Palette className="w-5 h-5" />
        </button>

        {/* Каталог */}
        <button
          type="button"
          aria-label="Каталог виджетов"
          onClick={() => setActiveModal('marketplace')}
          className="flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <ShoppingBag className="w-5 h-5" />
        </button>

        {/* Режим правки */}
        <button
          type="button"
          aria-label={isEditMode ? 'Завершить редактирование' : 'Редактировать сетку'}
          onClick={handleToggleEdit}
          className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl transition-colors cursor-pointer',
            isEditMode ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg hover:bg-surface-hover',
          )}
        >
          {isEditMode ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
        </button>

        {/* Настройки */}
        <button
          type="button"
          aria-label="Настройки"
          onClick={() => setActiveModal('settings')}
          className="flex items-center justify-center w-11 h-11 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>
      </nav>
    </>
  );
};
