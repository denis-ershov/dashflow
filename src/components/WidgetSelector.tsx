import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Cloud, 
  Calendar, 
  CheckSquare, 
  Bookmark, 
  Clock, 
  Search, 
  StickyNote, 
  Rss, 
  DollarSign, 
  Bitcoin,
  Trello,
  Globe,
  Music,
  FileText,
  X
} from 'lucide-react';
import { WidgetType } from '../types/widget';

interface WidgetSelectorProps {
  onClose: () => void;
  onSelectWidget: (type: WidgetType) => void;
}

interface WidgetOption {
  type: WidgetType;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  category: 'productivity' | 'information' | 'entertainment' | 'tools';
}

const widgetOptions: WidgetOption[] = [
  // Продуктивность
  {
    type: 'todo',
    icon: <CheckSquare size={24} />,
    titleKey: 'widgets:todo.title',
    descriptionKey: 'widgets:todo.description',
    category: 'productivity'
  },
  {
    type: 'calendar',
    icon: <Calendar size={24} />,
    titleKey: 'widgets:calendar.title',
    descriptionKey: 'widgets:calendar.description',
    category: 'productivity'
  },
  {
    type: 'notes',
    icon: <StickyNote size={24} />,
    titleKey: 'widgets:notes.title',
    descriptionKey: 'widgets:notes.description',
    category: 'productivity'
  },
  {
    type: 'kanban',
    icon: <Trello size={24} />,
    titleKey: 'widgets:kanban.title',
    descriptionKey: 'widgets:kanban.description',
    category: 'productivity'
  },
  {
    type: 'text-editor',
    icon: <FileText size={24} />,
    titleKey: 'widgets:textEditor.title',
    descriptionKey: 'widgets:textEditor.description',
    category: 'productivity'
  },
  
  // Информация
  {
    type: 'weather',
    icon: <Cloud size={24} />,
    titleKey: 'widgets:weather.title',
    descriptionKey: 'widgets:weather.description',
    category: 'information'
  },
  {
    type: 'clock',
    icon: <Clock size={24} />,
    titleKey: 'widgets:clock.title',
    descriptionKey: 'widgets:clock.description',
    category: 'information'
  },
  {
    type: 'rss',
    icon: <Rss size={24} />,
    titleKey: 'widgets:rss.title',
    descriptionKey: 'widgets:rss.description',
    category: 'information'
  },
  {
    type: 'currency',
    icon: <DollarSign size={24} />,
    titleKey: 'widgets:currency.title',
    descriptionKey: 'widgets:currency.description',
    category: 'information'
  },
  {
    type: 'crypto',
    icon: <Bitcoin size={24} />,
    titleKey: 'widgets:crypto.title',
    descriptionKey: 'widgets:crypto.description',
    category: 'information'
  },
  
  // Инструменты
  {
    type: 'search',
    icon: <Search size={24} />,
    titleKey: 'widgets:search.title',
    descriptionKey: 'widgets:search.description',
    category: 'tools'
  },
  {
    type: 'bookmarks',
    icon: <Bookmark size={24} />,
    titleKey: 'widgets:bookmarks.title',
    descriptionKey: 'widgets:bookmarks.description',
    category: 'tools'
  },
  {
    type: 'iframe',
    icon: <Globe size={24} />,
    titleKey: 'widgets:iframe.title',
    descriptionKey: 'widgets:iframe.description',
    category: 'tools'
  },
  
  // Развлечения
  {
    type: 'audio-player',
    icon: <Music size={24} />,
    titleKey: 'widgets:audioPlayer.title',
    descriptionKey: 'widgets:audioPlayer.description',
    category: 'entertainment'
  }
];

const categoryNames = {
  productivity: 'Продуктивность',
  information: 'Информация',
  tools: 'Инструменты', 
  entertainment: 'Развлечения'
};

const WidgetSelector: React.FC<WidgetSelectorProps> = ({ 
  onClose, 
  onSelectWidget 
}) => {
  const { t } = useTranslation(['common', 'widgets']);

  const categorizedWidgets = widgetOptions.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, WidgetOption[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-shadow rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-light-shadow/20 dark:border-dark-accent/20">
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-light">
            Выберите виджет
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-light-shadow/20 dark:hover:bg-dark-accent/20 rounded-lg transition-colors"
          >
            <X size={24} className="text-light-shadow dark:text-dark-light" />
          </button>
        </div>

        {/* Контент */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {Object.entries(categorizedWidgets).map(([category, widgets]) => (
            <div key={category} className="mb-8 last:mb-0">
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-light mb-4">
                {categoryNames[category as keyof typeof categoryNames]}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {widgets.map((widget) => (
                  <button
                    key={widget.type}
                    onClick={() => onSelectWidget(widget.type)}
                    className="p-4 bg-light-bg dark:bg-dark-bg hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 border border-light-shadow/20 dark:border-dark-accent/20 hover:border-light-accent dark:hover:border-dark-accent rounded-xl transition-all duration-200 text-left group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-light-accent/10 dark:bg-dark-accent/10 group-hover:bg-light-accent/20 dark:group-hover:bg-dark-accent/20 rounded-lg transition-colors">
                        <div className="text-light-accent dark:text-dark-accent">
                          {widget.icon}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-light-text dark:text-dark-light mb-1">
                          {t(widget.titleKey, widget.type)}
                        </h4>
                        <p className="text-sm text-light-shadow dark:text-dark-light/70 line-clamp-2">
                          {t(widget.descriptionKey, `${widget.type} widget description`)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Нижняя панель */}
        <div className="p-6 border-t border-light-shadow/20 dark:border-dark-accent/20 bg-light-bg/50 dark:bg-dark-bg/50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-light-shadow dark:text-dark-light/70">
              Создайте свой поток продуктивности с DashFlow
            </p>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetSelector;