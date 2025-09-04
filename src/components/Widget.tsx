import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Maximize2, 
  Minimize2, 
  X, 
  Move, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { WidgetConfig } from '../types/widget';
import { useDashboardStore } from '../store/dashboardStore';

interface WidgetProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  onSettingsClick?: () => void;
}

const Widget: React.FC<WidgetProps> = ({ 
  widget, 
  children, 
  onSettingsClick 
}) => {
  const { t } = useTranslation('common');
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  
  const {
    updateWidgetPosition,
    removeWidget,
    toggleWidgetVisibility,
    minimizeWidget,
    maximizeWidget,
    layoutLocked,
    gridSize
  } = useDashboardStore();

  useEffect(() => {
    const element = widgetRef.current;
    if (!element || layoutLocked) return;

    // Настройка draggable
    const cleanup = draggable({
      element,
      getInitialData: () => ({
        type: 'widget',
        widgetId: widget.id,
        position: widget.position
      }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false)
    });

    // Настройка drop target
    const cleanupDropTarget = dropTargetForElements({
      element,
      getData: () => ({ type: 'widget-drop-zone' }),
      onDragEnter: () => setIsDropTarget(true),
      onDragLeave: () => setIsDropTarget(false),
      onDrop: ({ source, self }) => {
        setIsDropTarget(false);
        
        const sourceData = source.data;
        if (sourceData.type === 'widget' && sourceData.widgetId !== widget.id) {
          // Обмен позициями виджетов
          const sourcePosition = sourceData.position;
          const targetPosition = widget.position;
          
          updateWidgetPosition(sourceData.widgetId as string, targetPosition);
          updateWidgetPosition(widget.id, sourcePosition);
        }
      }
    });

    return () => {
      cleanup();
      cleanupDropTarget();
    };
  }, [widget.id, widget.position, layoutLocked, updateWidgetPosition]);

  const gridCellSize = 100 / gridSize; // Размер ячейки в процентах
  
  const widgetStyle = {
    gridColumn: `${widget.position.x + 1} / span ${widget.position.width}`,
    gridRow: `${widget.position.y + 1} / span ${widget.position.height}`,
    opacity: widget.isVisible ? 1 : 0.5,
    transform: isDragging ? 'rotate(3deg) scale(1.05)' : 'none',
    zIndex: isDragging ? 50 : 10
  };

  return (
    <div
      ref={widgetRef}
      className={`
        widget-container relative transition-all duration-300 cursor-pointer
        ${isDragging ? 'shadow-2xl' : ''}
        ${isDropTarget ? 'ring-2 ring-light-accent dark:ring-dark-accent ring-opacity-50' : ''}
        ${widget.isMinimized ? 'h-12' : ''}
        ${!widget.isVisible ? 'opacity-50' : ''}
        ${!layoutLocked ? 'hover:shadow-lg' : ''}
      `}
      style={widgetStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Заголовок виджета */}
      <div className="widget-header">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-light-text dark:text-dark-light">
            {widget.title}
          </span>
        </div>
        
        {/* Кнопки управления */}
        {(isHovered || isDragging) && (
          <div className="flex items-center space-x-1">
            {!layoutLocked && (
              <div
                className="p-1 hover:bg-light-shadow/20 dark:hover:bg-dark-accent/20 rounded transition-colors cursor-grab active:cursor-grabbing"
                title={t('move')}
              >
                <Move size={14} className="text-light-shadow dark:text-dark-light" />
              </div>
            )}
            
            <button
              onClick={() => toggleWidgetVisibility(widget.id)}
              className="p-1 hover:bg-light-shadow/20 dark:hover:bg-dark-accent/20 rounded transition-colors"
              title={widget.isVisible ? 'Скрыть' : 'Показать'}
            >
              {widget.isVisible ? (
                <Eye size={14} className="text-light-shadow dark:text-dark-light" />
              ) : (
                <EyeOff size={14} className="text-light-shadow dark:text-dark-light" />
              )}
            </button>
            
            <button
              onClick={() => widget.isMinimized ? maximizeWidget(widget.id) : minimizeWidget(widget.id)}
              className="p-1 hover:bg-light-shadow/20 dark:hover:bg-dark-accent/20 rounded transition-colors"
              title={widget.isMinimized ? 'Развернуть' : 'Свернуть'}
            >
              {widget.isMinimized ? (
                <Maximize2 size={14} className="text-light-shadow dark:text-dark-light" />
              ) : (
                <Minimize2 size={14} className="text-light-shadow dark:text-dark-light" />
              )}
            </button>
            
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="p-1 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 rounded transition-colors"
                title={t('settings')}
              >
                <Settings size={14} className="text-light-accent dark:text-dark-accent" />
              </button>
            )}
            
            <button
              onClick={() => removeWidget(widget.id)}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
              title={t('delete')}
            >
              <X size={14} className="text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* Содержимое виджета */}
      {!widget.isMinimized && widget.isVisible && (
        <div className="widget-content">
          {children}
        </div>
      )}

      {/* Индикатор перетаскивания */}
      {isDropTarget && (
        <div className="absolute inset-0 bg-light-accent/10 dark:bg-dark-accent/10 border-2 border-dashed border-light-accent dark:border-dark-accent rounded-xl pointer-events-none" />
      )}

      {/* Индикатор обновления */}
      {isDragging && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-light-accent dark:bg-dark-accent rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default Widget;