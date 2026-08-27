import React from 'react';
import { Modal } from '@/ui/overlays';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAppStore } from '@/stores/useAppStore';
import { getTranslation } from '@/services/localization/i18n';
import { Clock, CloudSun, Search, CheckSquare, FileText, Bookmark, Link, Plus } from 'lucide-react';
import { Button } from '@/ui/primitives';

export const AddWidgetModal: React.FC = () => {
  const { activeModal, setActiveModal, addWidget } = useDashboardStore();
  const { language } = useAppStore();

  const isOpen = activeModal === 'addWidget';

  const availableWidgets = [
    {
      id: 'clock',
      title: getTranslation(language, 'widgets.clock'),
      desc: 'Цифровые часы, дата и часовой пояс',
      icon: <Clock className="w-6 h-6 text-blue-400" />,
      w: 4,
      h: 2,
    },
    {
      id: 'weather',
      title: getTranslation(language, 'widgets.weather'),
      desc: 'Прогноз погоды и температура',
      icon: <CloudSun className="w-6 h-6 text-amber-400" />,
      w: 4,
      h: 2,
    },
    {
      id: 'search',
      title: getTranslation(language, 'widgets.search'),
      desc: 'Строка поиска Google / DuckDuckGo',
      icon: <Search className="w-6 h-6 text-emerald-400" />,
      w: 4,
      h: 2,
    },
    {
      id: 'todo',
      title: getTranslation(language, 'widgets.todo'),
      desc: 'Список задач с дедлайнами и приоритетами',
      icon: <CheckSquare className="w-6 h-6 text-indigo-400" />,
      w: 6,
      h: 4,
    },
    {
      id: 'notes',
      title: getTranslation(language, 'widgets.notes'),
      desc: 'Быстрые заметки с автосохранением',
      icon: <FileText className="w-6 h-6 text-purple-400" />,
      w: 6,
      h: 4,
    },
    {
      id: 'bookmarks',
      title: getTranslation(language, 'widgets.bookmarks'),
      desc: 'Закладки браузера и папки',
      icon: <Bookmark className="w-6 h-6 text-rose-400" />,
      w: 6,
      h: 4,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setActiveModal(null)}
      title={getTranslation(language, 'toolbar.addWidget')}
      maxWidth="2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableWidgets.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                {w.icon}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">{w.title}</h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{w.desc}</p>
              </div>
            </div>

            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                addWidget(w.id, w.w, w.h);
                setActiveModal(null);
              }}
            >
              Добавить
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
};
