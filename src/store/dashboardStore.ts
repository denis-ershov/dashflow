import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WidgetConfig, WidgetType, WidgetPosition } from '../types/widget';

interface DashboardState {
  widgets: WidgetConfig[];
  gridSize: 12 | 16 | 24;
  layoutLocked: boolean;
  showGrid: boolean;
  backgroundImage?: string;
  backgroundColor?: string;
  customCSS: string;
  
  // Actions
  addWidget: (type: WidgetType, position?: Partial<WidgetPosition>) => string;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  updateWidgetPosition: (id: string, position: WidgetPosition) => void;
  updateWidgetSettings: (id: string, settings: Record<string, any>) => void;
  toggleWidgetVisibility: (id: string) => void;
  minimizeWidget: (id: string) => void;
  maximizeWidget: (id: string) => void;
  setGridSize: (size: 12 | 16 | 24) => void;
  toggleLayoutLock: () => void;
  toggleGrid: () => void;
  setBackgroundImage: (url: string) => void;
  setBackgroundColor: (color: string) => void;
  setCustomCSS: (css: string) => void;
  resetLayout: () => void;
  exportConfig: () => string;
  importConfig: (config: string) => void;
}

const generateWidgetId = (): string => {
  return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getDefaultPosition = (type: WidgetType, existingWidgets: WidgetConfig[]): WidgetPosition => {
  // Размеры по умолчанию для разных типов виджетов
  const defaultSizes: Record<WidgetType, { width: number; height: number }> = {
    weather: { width: 4, height: 3 },
    calendar: { width: 6, height: 4 },
    todo: { width: 4, height: 5 },
    bookmarks: { width: 3, height: 4 },
    clock: { width: 3, height: 2 },
    search: { width: 6, height: 1 },
    notes: { width: 4, height: 3 },
    rss: { width: 5, height: 4 },
    currency: { width: 3, height: 3 },
    crypto: { width: 4, height: 3 },
    kanban: { width: 8, height: 5 },
    iframe: { width: 6, height: 4 },
    'audio-player': { width: 4, height: 2 },
    'text-editor': { width: 6, height: 4 }
  };

  const { width, height } = defaultSizes[type];

  // Простой алгоритм размещения - ищем первое свободное место
  const gridSize = 12;
  let x = 0;
  let y = 0;

  // Проверяем, занято ли место
  const isPositionOccupied = (testX: number, testY: number): boolean => {
    return existingWidgets.some(widget => {
      const w = widget.position;
      return (
        testX < w.x + w.width &&
        testX + width > w.x &&
        testY < w.y + w.height &&
        testY + height > w.y
      );
    });
  };

  // Ищем свободное место
  while (isPositionOccupied(x, y)) {
    x += 1;
    if (x + width > gridSize) {
      x = 0;
      y += 1;
    }
  }

  return { x, y, width, height };
};

const getDefaultWidgetSettings = (type: WidgetType): Record<string, any> => {
  const defaults: Record<WidgetType, Record<string, any>> = {
    weather: {
      units: 'metric',
      showForecast: true,
      forecastDays: 5,
      language: 'ru'
    },
    clock: {
      format: '24h',
      showSeconds: true,
      showDate: true,
      clockType: 'digital',
      timezone: 'Europe/Moscow'
    },
    search: {
      defaultEngine: 'google',
      showSuggestions: true,
      openInNewTab: false
    },
    currency: {
      baseCurrency: 'RUB',
      targetCurrencies: ['USD', 'EUR'],
      refreshInterval: 60
    },
    crypto: {
      favoriteCoins: ['bitcoin', 'ethereum', 'cardano'],
      refreshInterval: 300,
      showChange: true,
      currency: 'usd'
    },
    calendar: { syncWithGoogle: false },
    todo: { defaultCategory: 'personal' },
    bookmarks: { showFavicons: true },
    notes: { defaultColor: '#fbbf24' },
    rss: { refreshInterval: 60 },
    kanban: { columns: ['To Do', 'In Progress', 'Done'] },
    iframe: { url: '', refreshInterval: 0 },
    'audio-player': { volume: 0.7, autoplay: false },
    'text-editor': { theme: 'default', wordWrap: true }
  };

  return defaults[type] || {};
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: [],
      gridSize: 12,
      layoutLocked: false,
      showGrid: true,
      customCSS: '',

      addWidget: (type: WidgetType, position?: Partial<WidgetPosition>) => {
        const id = generateWidgetId();
        const { widgets } = get();
        
        const defaultPosition = getDefaultPosition(type, widgets);
        const finalPosition = { ...defaultPosition, ...position };
        
        const newWidget: WidgetConfig = {
          id,
          type,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          position: finalPosition,
          settings: getDefaultWidgetSettings(type),
          isVisible: true,
          isMinimized: false,
          lastUpdated: new Date()
        };

        set(state => ({
          widgets: [...state.widgets, newWidget]
        }));

        return id;
      },

      removeWidget: (id: string) => {
        set(state => ({
          widgets: state.widgets.filter(w => w.id !== id)
        }));
      },

      updateWidget: (id: string, updates: Partial<WidgetConfig>) => {
        set(state => ({
          widgets: state.widgets.map(w => 
            w.id === id 
              ? { ...w, ...updates, lastUpdated: new Date() }
              : w
          )
        }));
      },

      updateWidgetPosition: (id: string, position: WidgetPosition) => {
        set(state => ({
          widgets: state.widgets.map(w => 
            w.id === id 
              ? { ...w, position, lastUpdated: new Date() }
              : w
          )
        }));
      },

      updateWidgetSettings: (id: string, settings: Record<string, any>) => {
        set(state => ({
          widgets: state.widgets.map(w => 
            w.id === id 
              ? { ...w, settings: { ...w.settings, ...settings }, lastUpdated: new Date() }
              : w
          )
        }));
      },

      toggleWidgetVisibility: (id: string) => {
        set(state => ({
          widgets: state.widgets.map(w => 
            w.id === id 
              ? { ...w, isVisible: !w.isVisible, lastUpdated: new Date() }
              : w
          )
        }));
      },

      minimizeWidget: (id: string) => {
        set(state => ({
          widgets: state.widgets.map(w => 
            w.id === id 
              ? { ...w, isMinimized: true, lastUpdated: new Date() }
              : w
          )
        }));
      },

      maximizeWidget: (id: string) => {
        set(state => ({
          widgets: state.widgets.map(w => 
            w.id === id 
              ? { ...w, isMinimized: false, lastUpdated: new Date() }
              : w
          )
        }));
      },

      setGridSize: (size: 12 | 16 | 24) => {
        set({ gridSize: size });
      },

      toggleLayoutLock: () => {
        set(state => ({ layoutLocked: !state.layoutLocked }));
      },

      toggleGrid: () => {
        set(state => ({ showGrid: !state.showGrid }));
      },

      setBackgroundImage: (url: string) => {
        set({ backgroundImage: url, backgroundColor: undefined });
      },

      setBackgroundColor: (color: string) => {
        set({ backgroundColor: color, backgroundImage: undefined });
      },

      setCustomCSS: (css: string) => {
        set({ customCSS: css });
      },

      resetLayout: () => {
        set({
          widgets: [],
          gridSize: 12,
          layoutLocked: false,
          showGrid: true,
          backgroundImage: undefined,
          backgroundColor: undefined,
          customCSS: ''
        });
      },

      exportConfig: () => {
        const state = get();
        const config = {
          widgets: state.widgets,
          gridSize: state.gridSize,
          backgroundImage: state.backgroundImage,
          backgroundColor: state.backgroundColor,
          customCSS: state.customCSS,
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        };
        return JSON.stringify(config, null, 2);
      },

      importConfig: (configString: string) => {
        try {
          const config = JSON.parse(configString);
          if (config.widgets && Array.isArray(config.widgets)) {
            set({
              widgets: config.widgets,
              gridSize: config.gridSize || 12,
              backgroundImage: config.backgroundImage,
              backgroundColor: config.backgroundColor,
              customCSS: config.customCSS || ''
            });
          }
        } catch (error) {
          console.error('Failed to import config:', error);
        }
      }
    }),
    {
      name: 'dashboard-config',
      // Исключаем некоторые временные состояния из сохранения
      partialize: (state) => ({
        widgets: state.widgets,
        gridSize: state.gridSize,
        layoutLocked: state.layoutLocked,
        showGrid: state.showGrid,
        backgroundImage: state.backgroundImage,
        backgroundColor: state.backgroundColor,
        customCSS: state.customCSS
      })
    }
  )
);