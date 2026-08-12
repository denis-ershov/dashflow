import React from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { X, Settings, GripHorizontal } from 'lucide-react';

export interface WidgetCardProps {
  instanceId: string;
  title: string;
  children: React.ReactNode;
  onOpenSettings?: () => void;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  instanceId,
  title,
  children,
  onOpenSettings,
}) => {
  const { isEditMode, removeWidget } = useDashboardStore();

  return (
    <div className="relative flex flex-col w-full h-full glass-panel rounded-2xl p-3.5 group overflow-hidden">
      {/* Шапка карточки */}
      <div className="flex items-center justify-between mb-2 select-none">
        <div className="flex items-center space-x-2 min-w-0">
          {isEditMode && (
            <div className="widget-drag-handle cursor-grab active:cursor-grabbing p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
              <GripHorizontal className="w-4 h-4" />
            </div>
          )}
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors truncate">
            {title}
          </h3>
        </div>

        {/* Кнопки вызова настроек и удаления */}
        <div className="flex items-center space-x-1">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              title="Настройки виджета"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {isEditMode && (
            <button
              onClick={() => removeWidget(instanceId)}
              className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Удалить виджет"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Тело виджета */}
      <div className="flex-1 w-full h-full overflow-auto relative">
        {children}
      </div>
    </div>
  );
};
