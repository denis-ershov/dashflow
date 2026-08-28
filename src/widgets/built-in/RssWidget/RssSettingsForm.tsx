import React from 'react';
import {
  List,
  Layers,
  FolderTree,
  Image as ImageIcon,
  AlignLeft,
  LayoutGrid,
  FileText,
  Sliders,
} from 'lucide-react';
import { Switch, Slider, Select } from '@/ui/primitives';
import { cn } from '@/ui/lib/cn';
import type {
  RssSettings,
  RssReadingMode,
  RssViewMode,
  RssCardStyle,
  RssBorderRadius,
} from './types';

export interface RssSettingsFormProps {
  settings?: RssSettings;
  onChange: (newSettings: RssSettings) => void;
}

export const RssSettingsForm: React.FC<RssSettingsFormProps> = ({
  settings = {},
  onChange,
}) => {
  const updateSetting = <K extends keyof RssSettings>(key: K, value: RssSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const readingMode: RssReadingMode = settings.readingMode || 'unified';
  const viewMode: RssViewMode = settings.viewMode || 'thumbnails';
  const cardStyle: RssCardStyle = settings.cardStyle || 'glass';
  const borderRadius: RssBorderRadius = settings.borderRadius || 'md';

  return (
    <div className="space-y-5 select-none">
      {/* 1. Режим чтения */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider block">
          Режим чтения новостей
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-hover/60 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => updateSetting('readingMode', 'unified')}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all cursor-pointer text-center',
              readingMode === 'unified'
                ? 'bg-surface text-primary shadow-sm border border-line font-bold'
                : 'text-fg-muted hover:text-fg hover:bg-surface/40',
            )}
          >
            <List className="w-4 h-4" />
            <span>Единая лента</span>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('readingMode', 'feed-tabs')}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all cursor-pointer text-center',
              readingMode === 'feed-tabs'
                ? 'bg-surface text-primary shadow-sm border border-line font-bold'
                : 'text-fg-muted hover:text-fg hover:bg-surface/40',
            )}
          >
            <Layers className="w-4 h-4" />
            <span>По источникам</span>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('readingMode', 'folders')}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all cursor-pointer text-center',
              readingMode === 'folders'
                ? 'bg-surface text-primary shadow-sm border border-line font-bold'
                : 'text-fg-muted hover:text-fg hover:bg-surface/40',
            )}
          >
            <FolderTree className="w-4 h-4" />
            <span>По папкам</span>
          </button>
        </div>
      </div>

      {/* 2. Стиль макета (вид ленты) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider block">
          Макет карточек новостей
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => updateSetting('viewMode', 'thumbnails')}
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer',
              viewMode === 'thumbnails'
                ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                : 'bg-surface border-line hover:border-line-hover text-fg',
            )}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>Миниатюры</span>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('viewMode', 'compact')}
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer',
              viewMode === 'compact'
                ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                : 'bg-surface border-line hover:border-line-hover text-fg',
            )}
          >
            <AlignLeft className="w-4 h-4 shrink-0" />
            <span>Компактный</span>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('viewMode', 'cards')}
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer',
              viewMode === 'cards'
                ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                : 'bg-surface border-line hover:border-line-hover text-fg',
            )}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Карточки</span>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('viewMode', 'grid')}
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer',
              viewMode === 'grid'
                ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                : 'bg-surface border-line hover:border-line-hover text-fg',
            )}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Сетка (2 кол.)</span>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('viewMode', 'magazine')}
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer col-span-2 sm:col-span-1',
              viewMode === 'magazine'
                ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                : 'bg-surface border-line hover:border-line-hover text-fg',
            )}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Журнальный</span>
          </button>
        </div>
      </div>

      {/* 3. Стиль оформления карточек */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-fg-muted block">Стиль подложки</label>
          <Select
            value={cardStyle}
            onChange={(e) => updateSetting('cardStyle', e.target.value as RssCardStyle)}
            options={[
              { label: 'Стекло (Glass)', value: 'glass' },
              { label: 'Сплошная (Solid)', value: 'solid' },
              { label: 'Контур (Outline)', value: 'outline' },
              { label: 'Прозрачная', value: 'transparent' },
            ]}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-fg-muted block">Скругление</label>
          <Select
            value={borderRadius}
            onChange={(e) => updateSetting('borderRadius', e.target.value as RssBorderRadius)}
            options={[
              { label: 'Без скругления', value: 'none' },
              { label: 'Малое (SM)', value: 'sm' },
              { label: 'Среднее (MD)', value: 'md' },
              { label: 'Большое (LG)', value: 'lg' },
            ]}
          />
        </div>
      </div>

      {/* 4. Лимит новостей и автообновление */}
      <div className="space-y-3 pt-2">
        <Slider
          label="Количество новостей на ленту"
          value={settings.itemCount ?? 12}
          min={3}
          max={50}
          step={1}
          onChange={(val) => updateSetting('itemCount', val)}
        />

        <div className="space-y-1">
          <label className="text-xs font-semibold text-fg-muted block">Автообновление</label>
          <Select
            value={String(settings.refreshInterval ?? 30)}
            onChange={(e) => updateSetting('refreshInterval', Number(e.target.value))}
            options={[
              { label: 'Только вручную', value: '0' },
              { label: 'Каждые 15 минут', value: '15' },
              { label: 'Каждые 30 минут', value: '30' },
              { label: 'Каждый час', value: '60' },
              { label: 'Каждые 6 часов', value: '360' },
            ]}
          />
        </div>
      </div>

      {/* 5. Элементы отображения */}
      <div className="space-y-2 pt-2 border-t border-line">
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider block">
          Отображение элементов
        </label>

        <Switch
          label="Показывать миниатюры (картинки)"
          checked={settings.showThumbnails !== false}
          onChange={(val) => updateSetting('showThumbnails', val)}
        />

        <Switch
          label="Показывать краткое описание"
          checked={settings.showDescription !== false}
          onChange={(val) => updateSetting('showDescription', val)}
        />

        <Switch
          label="Показывать источник (название ленты)"
          checked={settings.showSource !== false}
          onChange={(val) => updateSetting('showSource', val)}
        />

        <Switch
          label="Показывать время публикации"
          checked={settings.showDate !== false}
          onChange={(val) => updateSetting('showDate', val)}
        />

        <Switch
          label="Показывать строку быстрого поиска"
          checked={settings.showSearch !== false}
          onChange={(val) => updateSetting('showSearch', val)}
        />

        <Switch
          label="Открывать новость в новой вкладке"
          checked={settings.openInNewTab !== false}
          onChange={(val) => updateSetting('openInNewTab', val)}
        />
      </div>
    </div>
  );
};
