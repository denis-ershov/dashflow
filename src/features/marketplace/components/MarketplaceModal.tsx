import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/Button';
import {
  Download,
  ShieldAlert,
  Rss,
  Globe,
  Cpu,
  Flame,
  Quote,
  Sparkles,
  Blocks,
  CheckCircle2,
} from 'lucide-react';

export interface GalleryItem {
  id: string;
  name: string;
  category: string;
  type: 'system' | 'sdk';
  author: string;
  version: string;
  description: string;
  permissions: string[];
  icon: React.ReactNode;
  w: number;
  h: number;
}

export const CATALOG_ITEMS: GalleryItem[] = [
  {
    id: 'rssReader',
    name: 'RSS Новостной Ридер',
    category: 'News',
    type: 'sdk',
    author: 'DashFlow Team',
    version: '1.1.0',
    description: 'Агрегатор новостей с поддержкой мульти-лент, картинками и добавлением собственных RSS/XML источников.',
    permissions: ['network', 'storage'],
    icon: <Rss className="w-6 h-6 text-orange-400" />,
    w: 6,
    h: 4,
  },
  {
    id: 'iframe',
    name: 'Встроить Сайт (Iframe)',
    category: 'Utilities',
    type: 'system',
    author: 'DashFlow Core',
    version: '1.0.0',
    description: 'Отображение любого сайта или веб-страницы на вашем рабочем столе с настройкой масштабирования.',
    permissions: ['storage'],
    icon: <Globe className="w-6 h-6 text-sky-400" />,
    w: 6,
    h: 4,
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro & Звуки Фокуса',
    category: 'Productivity',
    type: 'system',
    author: 'DashFlow Core',
    version: '1.0.0',
    description: 'Фокус-таймер 25/5 мин и генератор фоновых звуков шума природы на Web Audio API.',
    permissions: ['storage'],
    icon: <Flame className="w-6 h-6 text-amber-400" />,
    w: 4,
    h: 3,
  },
  {
    id: 'systemMonitor',
    name: 'Монитор Системы',
    category: 'Developer',
    type: 'system',
    author: 'DashFlow Core',
    version: '1.0.0',
    description: 'Мониторинг сетевого подключения (Online/Offline) и отслеживание заряда батареи.',
    permissions: ['storage'],
    icon: <Cpu className="w-6 h-6 text-emerald-400" />,
    w: 6,
    h: 2,
  },
  {
    id: 'quotes',
    name: 'Цитата Дня',
    category: 'Entertainment',
    type: 'system',
    author: 'DashFlow Core',
    version: '1.0.0',
    description: 'Вдохновляющие цитаты великих ученых, программистов и мыслителей.',
    permissions: [],
    icon: <Quote className="w-6 h-6 text-purple-400" />,
    w: 6,
    h: 2,
  },
];

export const MarketplaceModal: React.FC = () => {
  const { activeModal, setActiveModal, widgets, addWidget, removeWidget } = useDashboardStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTab, setSelectedTab] = useState<'all' | 'system' | 'sdk'>('all');

  const isOpen = activeModal === 'marketplace';

  const categories = ['All', 'News', 'Utilities', 'Productivity', 'Developer', 'Entertainment'];

  const filtered = CATALOG_ITEMS.filter((item) => {
    const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchTab = selectedTab === 'all' || item.type === selectedTab;
    return matchCategory && matchTab;
  });

  const isInstalled = (widgetId: string) => {
    return widgets.some((w) => w.widgetId === widgetId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setActiveModal(null)}
      title="Галерея Виджетов & Плагинов DashFlow"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Главные вкладки типов */}
        <div className="flex items-center space-x-2 bg-[var(--color-bg)] p-1.5 rounded-xl border border-[var(--color-border)]">
          <button
            onClick={() => setSelectedTab('all')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTab === 'all'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Все ({CATALOG_ITEMS.length})
          </button>
          <button
            onClick={() => setSelectedTab('system')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTab === 'system'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Системные Виджеты
          </button>
          <button
            onClick={() => setSelectedTab('sdk')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTab === 'sdk'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Плагины Сообщества (SDK)
          </button>
        </div>

        {/* Категории */}
        <div className="flex space-x-2 border-b border-[var(--color-border)] pb-3 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--color-surface-hover)] text-[var(--color-primary)] border border-[var(--color-primary)]/40'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Список реальных виджетов */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((item) => {
            const installed = isInstalled(item.id);

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between p-4 rounded-2xl glass-panel space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--color-text)]">{item.name}</h4>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          от {item.author} • v{item.version}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        item.type === 'system'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {item.type === 'system' ? 'Системный' : 'SDK Плагин'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)] mt-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Разрешения */}
                  <div className="flex items-center space-x-1.5 mt-3">
                    <ShieldAlert className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      Права: {item.permissions.length > 0 ? item.permissions.join(', ') : 'Не требуются'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                    Размер: {item.w}x{item.h}
                  </span>

                  {installed ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const instance = widgets.find((w) => w.widgetId === item.id);
                        if (instance) removeWidget(instance.instanceId);
                      }}
                    >
                      Удалить
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Download className="w-3.5 h-3.5" />}
                      onClick={() => {
                        addWidget(item.id, item.w, item.h);
                      }}
                    >
                      Добавить на экран
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
