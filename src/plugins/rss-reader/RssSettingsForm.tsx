import React, { useState, useEffect } from 'react';
import { StorageAdapter } from '@/services/storage/StorageAdapter';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Check } from 'lucide-react';

export interface CustomFeed {
  id: string;
  name: string;
  url: string;
}

export type RssViewMode = 'compact' | 'thumbnails' | 'cards' | 'grid';

export const PRESET_RSS_FEEDS: CustomFeed[] = [
  { id: 'habr', name: 'Хабр (Главное)', url: 'https://habr.com/ru/rss/best/daily/' },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { id: 'hackernews', name: 'Hacker News', url: 'https://news.ycombinator.com/rss' },
];

export interface RssSettingsFormProps {
  instanceId: string;
  onClose: () => void;
}

export const RssSettingsForm: React.FC<RssSettingsFormProps> = ({ instanceId, onClose }) => {
  const { widgets, updateWidgetSettings } = useDashboardStore();
  const currentWidget = widgets.find((w) => w.instanceId === instanceId);

  const [availableFeeds, setAvailableFeeds] = useState<CustomFeed[]>(PRESET_RSS_FEEDS);
  const [selectedUrls, setSelectedUrls] = useState<string[]>(
    currentWidget?.settings?.selectedFeedUrls || [PRESET_RSS_FEEDS[0].url]
  );
  const [viewMode, setViewMode] = useState<RssViewMode>(
    currentWidget?.settings?.viewMode || 'thumbnails'
  );

  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');

  useEffect(() => {
    StorageAdapter.get<CustomFeed[]>('rss_custom_feeds_pool', PRESET_RSS_FEEDS).then((saved) => {
      if (saved && saved.length > 0) setAvailableFeeds(saved);
    });
  }, []);

  const toggleFeedSelection = (url: string) => {
    if (selectedUrls.includes(url)) {
      if (selectedUrls.length > 1) {
        setSelectedUrls(selectedUrls.filter((u) => u !== url));
      }
    } else {
      setSelectedUrls([...selectedUrls, url]);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;

    const newFeed: CustomFeed = {
      id: Date.now().toString(),
      name: newFeedName.trim(),
      url: newFeedUrl.trim(),
    };

    const updatedPool = [...availableFeeds, newFeed];
    setAvailableFeeds(updatedPool);
    setSelectedUrls([...selectedUrls, newFeed.url]);
    await StorageAdapter.set('rss_custom_feeds_pool', updatedPool);

    setNewFeedName('');
    setNewFeedUrl('');
  };

  const handleSave = () => {
    updateWidgetSettings(instanceId, {
      selectedFeedUrls: selectedUrls,
      viewMode,
    });
    onClose();
  };

  return (
    <div className="space-y-5">
      {/* Настройка мульти-микширования источников чекбоксами */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-2">
          Выберите ленты для показа (Мульти-микс)
        </h4>
        <p className="text-[11px] text-[var(--color-text-muted)] mb-3">
          Отметьте чекбоксами несколько RSS-каналов для объединения новостей в 1 общую ленту.
        </p>

        <div className="space-y-2">
          {availableFeeds.map((feed) => {
            const isChecked = selectedUrls.includes(feed.url);

            return (
              <label
                key={feed.id}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-[var(--color-surface-hover)] border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleFeedSelection(feed.url)}
                    className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text)]">{feed.name}</span>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[220px]">
                      {feed.url}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Добавление своего RSS канала */}
      <form onSubmit={handleAddFeed} className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
        <span className="text-xs font-semibold text-[var(--color-secondary)]">Добавить свой RSS источник</span>
        <input
          type="text"
          placeholder="Название ленты (напр. VC.ru)"
          value={newFeedName}
          onChange={(e) => setNewFeedName(e.target.value)}
          className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
        />
        <input
          type="text"
          placeholder="URL RSS ленты (https://...)"
          value={newFeedUrl}
          onChange={(e) => setNewFeedUrl(e.target.value)}
          className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
        />
        <Button size="sm" variant="secondary" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
          Добавить источник в список
        </Button>
      </form>

      {/* Выбор режима вида */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-2">
          Стиль отображения ленты
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'compact', label: 'Компактный список' },
            { id: 'thumbnails', label: 'Список с картинами' },
            { id: 'cards', label: 'Подробные карточки' },
            { id: 'grid', label: 'Плиточная сетка' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as RssViewMode)}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                viewMode === mode.id
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 flex justify-end space-x-2">
        <Button size="sm" variant="primary" onClick={handleSave}>
          Сохранить настройки RSS
        </Button>
      </div>
    </div>
  );
};
