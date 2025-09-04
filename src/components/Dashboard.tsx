import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Settings, Grid, Lock, Unlock } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { WidgetType } from '../types/widget';
import Widget from './Widget';
import WidgetSelector from './WidgetSelector';
import WeatherWidget from './widgets/WeatherWidget';
import ClockWidget from './widgets/ClockWidget';
import SearchWidget from './widgets/SearchWidget';
import TodoWidget from './widgets/TodoWidget';
import NotesWidget from './widgets/NotesWidget';

const Dashboard: React.FC = () => {
  const { t } = useTranslation('common');
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    widgets,
    gridSize,
    layoutLocked,
    showGrid,
    backgroundImage,
    backgroundColor,
    addWidget,
    toggleLayoutLock,
    toggleGrid
  } = useDashboardStore();

  const renderWidget = (widgetConfig: any) => {
    const commonProps = {
      key: widgetConfig.id,
      widget: widgetConfig,
      onSettingsClick: () => {
        // Открыть настройки конкретного виджета
        console.log('Settings for:', widgetConfig.type);
      }
    };

    switch (widgetConfig.type) {
      case 'weather':
        return (
          <Widget {...commonProps}>
            <WeatherWidget config={widgetConfig} />
          </Widget>
        );
      case 'clock':
        return (
          <Widget {...commonProps}>
            <ClockWidget config={widgetConfig} />
          </Widget>
        );
      case 'search':
        return (
          <Widget {...commonProps}>
            <SearchWidget config={widgetConfig} />
          </Widget>
        );
      case 'todo':
        return (
          <Widget {...commonProps}>
            <TodoWidget config={widgetConfig} />
          </Widget>
        );
      case 'notes':
        return (
          <Widget {...commonProps}>
            <NotesWidget config={widgetConfig} />
          </Widget>
        );
      default:
        return (
          <Widget {...commonProps}>
            <div className="text-center text-light-shadow dark:text-dark-light">
              {t('widgets:' + widgetConfig.type + '.title', widgetConfig.type)}
            </div>
          </Widget>
        );
    }
  };

  const dashboardStyle = {
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundColor: backgroundColor || undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
    gridTemplateRows: `repeat(20, 60px)`, // 20 строк по 60px
    gap: '16px',
    padding: '20px',
    minHeight: '100vh',
    position: 'relative' as const
  };

  return (
    <div 
      className="min-h-screen transition-all duration-300"
      style={dashboardStyle}
    >
      {/* Фоновая сетка */}
      {showGrid && (
        <div 
          className="fixed inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,124,199,0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,124,199,0.3) 1px, transparent 1px)
            `,
            backgroundSize: `${100/gridSize}% 50px`
          }}
        />
      )}

      {/* Панель управления */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
        <button
          onClick={toggleGrid}
          className={`p-2 rounded-lg backdrop-blur-sm border transition-all duration-200 ${
            showGrid 
              ? 'bg-light-accent/20 dark:bg-dark-accent/20 border-light-accent/50 dark:border-dark-accent/50 text-light-accent dark:text-dark-accent' 
              : 'bg-white/20 dark:bg-dark-shadow/50 border-light-shadow/20 dark:border-dark-accent/20 text-light-shadow dark:text-dark-light hover:bg-white/30 dark:hover:bg-dark-shadow/70'
          }`}
          title={showGrid ? t('hideGrid') : t('showGrid')}
        >
          <Grid size={18} />
        </button>

        <button
          onClick={toggleLayoutLock}
          className={`p-2 rounded-lg backdrop-blur-sm border transition-all duration-200 ${
            layoutLocked
              ? 'bg-red-500/20 border-red-500/50 text-red-500'
              : 'bg-white/20 dark:bg-dark-shadow/50 border-light-shadow/20 dark:border-dark-accent/20 text-light-shadow dark:text-dark-light hover:bg-white/30 dark:hover:bg-dark-shadow/70'
          }`}
          title={layoutLocked ? t('unlockLayout') : t('lockLayout')}
        >
          {layoutLocked ? <Lock size={18} /> : <Unlock size={18} />}
        </button>

        <button
          onClick={() => setShowWidgetSelector(true)}
          className="p-2 bg-light-accent dark:bg-dark-accent hover:bg-light-accent-secondary dark:hover:bg-dark-accent-secondary text-white rounded-lg backdrop-blur-sm border border-light-accent/50 dark:border-dark-accent/50 transition-all duration-200"
          title={t('addWidget')}
        >
          <Plus size={18} />
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="p-2 bg-white/20 dark:bg-dark-shadow/50 hover:bg-white/30 dark:hover:bg-dark-shadow/70 text-light-shadow dark:text-dark-light rounded-lg backdrop-blur-sm border border-light-shadow/20 dark:border-dark-accent/20 transition-all duration-200"
          title={t('settings')}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Приветствие для пустого Dashboard */}
      {widgets.length === 0 && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="glass-morphism p-8 rounded-2xl max-w-md mx-auto">
              <div className="text-6xl mb-4">⚡</div>
              <h1 className="text-3xl font-bold text-light-text dark:text-dark-light mb-2">
                Добро пожаловать в DashFlow!
              </h1>
              <p className="text-light-shadow dark:text-dark-light/70 mb-6">
                Создайте свой поток продуктивности, добавив первый виджет. 
                Начните с погоды, часов или списка задач.
              </p>
              <button
                onClick={() => setShowWidgetSelector(true)}
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>{t('addWidget')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Сетка виджетов */}
      {widgets.length > 0 && (
        <div style={gridStyle}>
          {widgets.map(widget => renderWidget(widget))}
        </div>
      )}

      {/* Селектор виджетов */}
      {showWidgetSelector && (
        <WidgetSelector
          onClose={() => setShowWidgetSelector(false)}
          onSelectWidget={(type: WidgetType) => {
            addWidget(type);
            setShowWidgetSelector(false);
          }}
        />
      )}

      {/* Панель настроек */}
      {showSettings && (
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;