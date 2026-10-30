import React, { useState } from 'react';
import { Modal } from '@/ui/overlays';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslation } from '@/core/i18n';
import { Switch, Slider, Button } from '@/ui/primitives';
import { ImportExportModal } from './ImportExportModal';
import { Globe, Layout, Sparkles, SlidersHorizontal, Activity } from 'lucide-react';
import { DiagnosticsSection } from './DiagnosticsSection';
import { runLogged } from '@/core/observability';
import type { HeroSettings } from '@/core/storage/dashboardMigrations';

export const SettingsModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    baseColumns,
    setBaseColumns,
    gap,
    setGap,
    layoutMode,
    setLayoutMode,
    heroSettings,
    updateHeroSettings,
  } = useDashboardStore(
    useShallow((s) => ({
      activeModal: s.activeModal,
      setActiveModal: s.setActiveModal,
      baseColumns: s.baseColumns,
      setBaseColumns: s.setBaseColumns,
      gap: s.gap,
      setGap: s.setGap,
      layoutMode: s.layoutMode,
      setLayoutMode: s.setLayoutMode,
      heroSettings: s.heroSettings,
      updateHeroSettings: s.updateHeroSettings,
    })),
  );
  const { language, setLanguage, animationsEnabled, setAnimationsEnabled } = useAppStore(
    useShallow((s) => ({
      language: s.language,
      setLanguage: s.setLanguage,
      animationsEnabled: s.animationsEnabled,
      setAnimationsEnabled: s.setAnimationsEnabled,
    })),
  );
  const { t, tp } = useTranslation();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'diagnostics'>('general');

  const isOpen = activeModal === 'settings';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setActiveModal(null)}
      title={t('settings.title')}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Переключатель вкладок настроек */}
        <div className="flex border-b border-line pb-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t('layoutSettings.tabGeneral')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-fg-muted hover:text-fg hover:bg-surface'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t('layoutSettings.tabDiagnostics')}</span>
          </button>
        </div>

        {activeTab === 'diagnostics' ? (
          <DiagnosticsSection />
        ) : (
          <>
            {/* Секция 1: Режим макета рабочего стола */}
        <div className="p-4 rounded-xl bg-surface border border-line space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Layout className="w-4 h-4" />
            <span>{t('layoutSettings.modeTitle')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setLayoutMode('modular')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                layoutMode === 'modular'
                  ? 'bg-primary/10 border-primary text-fg font-semibold shadow-1'
                  : 'bg-surface hover:bg-surface-hover border-line text-fg-muted'
              }`}
            >
              <span className="text-xs font-bold text-fg mb-1">{t('layoutSettings.modes.modular')}</span>
              <span className="text-2xs text-fg-muted">{t('layoutSettings.modes.modularHint')}</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('canvas')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                layoutMode === 'canvas'
                  ? 'bg-primary/10 border-primary text-fg font-semibold shadow-1'
                  : 'bg-surface hover:bg-surface-hover border-line text-fg-muted'
              }`}
            >
              <span className="text-xs font-bold text-fg mb-1">{t('layoutSettings.modes.canvas')}</span>
              <span className="text-2xs text-fg-muted">{t('layoutSettings.modes.canvasHint')}</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('zen')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                layoutMode === 'zen'
                  ? 'bg-primary/10 border-primary text-fg font-semibold shadow-1'
                  : 'bg-surface hover:bg-surface-hover border-line text-fg-muted'
              }`}
            >
              <span className="text-xs font-bold text-fg mb-1">{t('layoutSettings.modes.zen')}</span>
              <span className="text-2xs text-fg-muted">{t('layoutSettings.modes.zenHint')}</span>
            </button>
          </div>
        </div>

        {/* Секция 2: Настройки Hero-зоны */}
        {layoutMode !== 'canvas' && (
          <div className="p-4 rounded-xl bg-surface border border-line space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Sparkles className="w-4 h-4" />
              <span>{t('layoutSettings.heroTitle')}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">{t('layoutSettings.showClock')}</span>
                <Switch
                  checked={heroSettings?.showClock !== false}
                  onChange={(val) => updateHeroSettings({ showClock: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">{t('layoutSettings.showGreeting')}</span>
                <Switch
                  checked={heroSettings?.showGreeting !== false}
                  onChange={(val) => updateHeroSettings({ showGreeting: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">{t('layoutSettings.showSearch')}</span>
                <Switch
                  checked={heroSettings?.showSearchBar !== false}
                  onChange={(val) => updateHeroSettings({ showSearchBar: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">{t('layoutSettings.showYearProgress')}</span>
                <Switch
                  checked={heroSettings?.showYearProgress !== false}
                  onChange={(val) => updateHeroSettings({ showYearProgress: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">{t('layoutSettings.showSpeedDial')}</span>
                <Switch
                  checked={heroSettings?.showSpeedDial !== false}
                  onChange={(val) => updateHeroSettings({ showSpeedDial: val })}
                />
              </div>

              {/* Выравнивание Hero */}
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <span className="text-xs font-medium text-fg">{t('layoutSettings.alignment')}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={heroSettings?.alignment === 'left' ? 'primary' : 'secondary'}
                    onClick={() => updateHeroSettings({ alignment: 'left' })}
                  >
                    {t('layoutSettings.alignLeft')}
                  </Button>
                  <Button
                    size="sm"
                    variant={(heroSettings?.alignment || 'center') === 'center' ? 'primary' : 'secondary'}
                    onClick={() => updateHeroSettings({ alignment: 'center' })}
                  >
                    {t('layoutSettings.alignCenter')}
                  </Button>
                </div>
              </div>

              {/* Стиль часов */}
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <span className="text-xs font-medium text-fg">{t('layoutSettings.clockStyle')}</span>
                <select
                  value={heroSettings?.clockStyle || 'digital'}
                  onChange={(e) =>
                    updateHeroSettings({ clockStyle: e.target.value as HeroSettings['clockStyle'] })
                  }
                  className="bg-surface text-xs text-fg border border-line rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                >
                  <option value="digital">{t('layoutSettings.clockStyles.digital')}</option>
                  <option value="minimal">{t('layoutSettings.clockStyles.minimal')}</option>
                  <option value="serif">{t('layoutSettings.clockStyles.serif')}</option>
                  <option value="mono">{t('layoutSettings.clockStyles.mono')}</option>
                  <option value="flip">{t('layoutSettings.clockStyles.flip')}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Секция 3: Сетка и Расположение */}
        <div className="p-4 rounded-xl bg-surface border border-line space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <SlidersHorizontal className="w-4 h-4" />
            <span>{t('settings.layout')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">{t('layoutSettings.columnsTitle')}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={baseColumns === 12 ? 'primary' : 'secondary'}
                onClick={() => setBaseColumns(12)}
              >
                {tp('layoutSettings.columnsCount', 12)}
              </Button>
              <Button
                size="sm"
                variant={baseColumns === 16 ? 'primary' : 'secondary'}
                onClick={() => setBaseColumns(16)}
              >
                {tp('layoutSettings.columnsCount', 16)}
              </Button>
              <Button
                size="sm"
                variant={baseColumns === 24 ? 'primary' : 'secondary'}
                onClick={() => setBaseColumns(24)}
              >
                {tp('layoutSettings.columnsCount', 24)}
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <Slider
              label={t('layoutSettings.gap')}
              value={gap}
              min={8}
              max={32}
              step={4}
              unit="px"
              onChange={setGap}
            />
          </div>
        </div>

        {/* Секция 4: Основные настройки */}
        <div className="p-4 rounded-xl bg-surface border border-line space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Globe className="w-4 h-4" />
            <span>{t('settings.general')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">{t('settings.language')}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={language === 'ru' ? 'primary' : 'secondary'}
                onClick={() => runLogged(setLanguage('ru'), 'storage')}
              >
                {t('languages.ru')}
              </Button>
              <Button
                size="sm"
                variant={language === 'en' ? 'primary' : 'secondary'}
                onClick={() => runLogged(setLanguage('en'), 'storage')}
              >
                {t('languages.en')}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-fg">{t('settings.animations')}</span>
            <Switch
              checked={animationsEnabled}
              onChange={(value) => runLogged(setAnimationsEnabled(value), 'storage')}
            />
          </div>
        </div>

        {/* Секция 5: Импорт и Экспорт */}
        <div className="p-4 rounded-xl bg-surface border border-line flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-fg">{t('layoutSettings.backupTitle')}</p>
            <p className="text-2xs text-fg-muted">{t('layoutSettings.backupHint')}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setIsImportOpen(true)}>
            {t('layoutSettings.backupAction')}
          </Button>
        </div>

        <ImportExportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
          </>
        )}
      </div>
    </Modal>
  );
};
