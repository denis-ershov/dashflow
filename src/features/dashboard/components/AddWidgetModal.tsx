import React, { useState, useMemo } from 'react';
import {
  Clock,
  CloudSun,
  Search,
  CheckSquare,
  FileText,
  Link2,
  Bookmark,
  Globe,
  Timer,
  Quote,
  Cpu,
  Rss,
  Plus,
  Boxes,
} from 'lucide-react';
import { Modal } from '@/ui/overlays/Modal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslation } from '@/core/i18n';
import { WidgetRegistry } from '@/core/widget/registry';
import type { WidgetCategory } from '@/core/widget/types';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Badge } from '@/ui/primitives/Badge';
import { EmptyState } from '@/ui/feedback/EmptyState';

const WIDGET_ICONS: Record<string, React.ReactNode> = {
  clock: <Clock className="w-5 h-5 text-primary" />,
  search: <Search className="w-5 h-5 text-secondary" />,
  weather: <CloudSun className="w-5 h-5 text-warning" />,
  todo: <CheckSquare className="w-5 h-5 text-success" />,
  notes: <FileText className="w-5 h-5 text-primary" />,
  quickLinks: <Link2 className="w-5 h-5 text-primary" />,
  bookmarks: <Bookmark className="w-5 h-5 text-warning" />,
  iframe: <Globe className="w-5 h-5 text-secondary" />,
  pomodoro: <Timer className="w-5 h-5 text-danger" />,
  quotes: <Quote className="w-5 h-5 text-primary" />,
  systemMonitor: <Cpu className="w-5 h-5 text-success" />,
  rssReader: <Rss className="w-5 h-5 text-warning" />,
};

const CATEGORIES: { key: WidgetCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'utilities', label: 'Утилиты' },
  { key: 'productivity', label: 'Продуктивность' },
  { key: 'news', label: 'Новости' },
  { key: 'entertainment', label: 'Развлечения' },
  { key: 'developer', label: 'Разработчику' },
];

export const AddWidgetModal: React.FC = () => {
  const { t } = useTranslation();
  const { activeModal, setActiveModal, addWidget } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all');

  const isOpen = activeModal === 'addWidget';

  const allWidgets = useMemo(() => WidgetRegistry.getAll(), [isOpen]);

  const filteredWidgets = useMemo(() => {
    return allWidgets.filter((w) => {
      const matchesCategory =
        selectedCategory === 'all' || w.category === selectedCategory;

      const title = String(w.nameKey ? t(w.nameKey) : w.name || w.id).toLowerCase();
      const desc = String(w.descriptionKey ? t(w.descriptionKey) : w.description || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || title.includes(q) || desc.includes(q) || w.id.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [allWidgets, selectedCategory, searchQuery, t]);

  const handleAdd = (widgetId: string, defaultW?: number, defaultH?: number) => {
    addWidget(widgetId, defaultW, defaultH);
    setActiveModal(null);
    setSearchQuery('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setActiveModal(null)}
      title={t('toolbar.addWidget')}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Поиск и категории */}
        <div className="space-y-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск виджетов по названию или описанию..."
            aria-label="Поиск виджетов"
            icon={<Search className="w-4 h-4 text-fg-muted" />}
          />

          {/* Фильтры категорий */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat.key
                    ? 'bg-primary text-primary-fg'
                    : 'bg-surface text-fg-muted hover:text-fg hover:bg-surface-hover border border-line'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Сетка доступных виджетов */}
        {filteredWidgets.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить поисковый запрос или категорию"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
            {filteredWidgets.map((w) => {
              const title = w.nameKey ? t(w.nameKey) : w.name || w.id;
              const desc = w.descriptionKey ? t(w.descriptionKey) : w.description || '';
              const icon = WIDGET_ICONS[w.id] || <Boxes className="w-5 h-5 text-primary" />;

              return (
                <div
                  key={w.id}
                  className="flex flex-col justify-between p-3 rounded-xl glass-panel border border-line hover:border-primary transition-all duration-normal group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-surface border border-line shrink-0">
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-fg truncate">
                          {title}
                        </h4>
                        <Badge variant="glass">
                          {w.size.defaultW}×{w.size.defaultH}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-fg-muted mt-1 line-clamp-2">
                        {desc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-line flex items-center justify-between">
                    <span className="text-[10px] text-fg-muted font-mono capitalize">
                      {w.surface}
                    </span>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAdd(w.id, w.size.defaultW, w.size.defaultH)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Добавить
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
