import React from 'react';
import { useTranslation } from '@/core/i18n';
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
  const { t } = useTranslation();
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
          {t('rss.form.readingTitle')}
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
            <span>{t('rss.form.unified')}</span>
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
            <span>{t('rss.form.bySource')}</span>
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
            <span>{t('rss.form.byFolder')}</span>
          </button>
        </div>
      </div>

      {/* 2. Стиль макета (вид ленты) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider block">
          {t('rss.form.layoutTitle')}
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
            <span>{t('rss.form.thumbnails')}</span>
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
            <span>{t('rss.form.compact')}</span>
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
            <span>{t('rss.form.cards')}</span>
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
            <span>{t('rss.form.grid')}</span>
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
            <span>{t('rss.form.magazine')}</span>
          </button>
        </div>
      </div>

      {/* 3. Стиль оформления карточек */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-fg-muted block">{t('rss.form.cardStyle')}</label>
          <Select
            value={cardStyle}
            onChange={(e) => updateSetting('cardStyle', e.target.value as RssCardStyle)}
            options={[
              { label: t('rss.form.glass'), value: 'glass' },
              { label: t('rss.form.solid'), value: 'solid' },
              { label: t('rss.form.outline'), value: 'outline' },
              { label: t('rss.form.transparent'), value: 'transparent' },
            ]}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-fg-muted block">{t('rss.form.radius')}</label>
          <Select
            value={borderRadius}
            onChange={(e) => updateSetting('borderRadius', e.target.value as RssBorderRadius)}
            options={[
              { label: t('rss.form.radiusNone'), value: 'none' },
              { label: t('rss.form.radiusSm'), value: 'sm' },
              { label: t('rss.form.radiusMd'), value: 'md' },
              { label: t('rss.form.radiusLg'), value: 'lg' },
            ]}
          />
        </div>
      </div>

      {/* 4. Лимит новостей и автообновление */}
      <div className="space-y-3 pt-2">
        <Slider
          label={t('rss.form.itemCount')}
          value={settings.itemCount ?? 12}
          min={3}
          max={50}
          step={1}
          onChange={(val) => updateSetting('itemCount', val)}
        />

        <div className="space-y-1">
          <label className="text-xs font-semibold text-fg-muted block">{t('rss.form.autoRefresh')}</label>
          <Select
            value={String(settings.refreshInterval ?? 30)}
            onChange={(e) => updateSetting('refreshInterval', Number(e.target.value))}
            options={[
              { label: t('rss.form.manual'), value: '0' },
              { label: t('rss.form.every15'), value: '15' },
              { label: t('rss.form.every30'), value: '30' },
              { label: t('rss.form.everyHour'), value: '60' },
              { label: t('rss.form.every6h'), value: '360' },
            ]}
          />
        </div>
      </div>

      {/* 5. Элементы отображения */}
      <div className="space-y-2 pt-2 border-t border-line">
        <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider block">
          {t('rss.form.elements')}
        </label>

        <Switch
          label={t('rss.form.showThumbnails')}
          checked={settings.showThumbnails !== false}
          onChange={(val) => updateSetting('showThumbnails', val)}
        />

        <Switch
          label={t('rss.form.showDescription')}
          checked={settings.showDescription !== false}
          onChange={(val) => updateSetting('showDescription', val)}
        />

        <Switch
          label={t('rss.form.showSource')}
          checked={settings.showSource !== false}
          onChange={(val) => updateSetting('showSource', val)}
        />

        <Switch
          label={t('rss.form.showTime')}
          checked={settings.showDate !== false}
          onChange={(val) => updateSetting('showDate', val)}
        />

        <Switch
          label={t('rss.form.showSearch')}
          checked={settings.showSearch !== false}
          onChange={(val) => updateSetting('showSearch', val)}
        />

        <Switch
          label={t('rss.form.openInNewTab')}
          checked={settings.openInNewTab !== false}
          onChange={(val) => updateSetting('openInNewTab', val)}
        />
      </div>
    </div>
  );
};
