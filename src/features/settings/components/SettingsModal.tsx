import React, { useState } from 'react';
import { Modal } from '@/ui/overlays';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAppStore } from '@/stores/useAppStore';
import { getTranslation } from '@/services/localization/i18n';
import { Switch, Slider, Button } from '@/ui/primitives';
import { ImportExportModal } from './ImportExportModal';
import { Globe, Layout, Sparkles, SlidersHorizontal } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    columns,
    setColumns,
    gap,
    setGap,
    layoutMode,
    setLayoutMode,
    heroSettings,
    updateHeroSettings,
  } = useDashboardStore();
  const { language, setLanguage, animationsEnabled, setAnimationsEnabled } = useAppStore();
  const [isImportOpen, setIsImportOpen] = useState(false);

  const isOpen = activeModal === 'settings';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setActiveModal(null)}
      title={getTranslation(language, 'settings.title')}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Секция 1: Режим макета рабочего стола */}
        <div className="p-4 rounded-xl bg-surface border border-line space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <Layout className="w-4 h-4" />
            <span>Режим макета и холста</span>
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
              <span className="text-xs font-bold text-fg mb-1">Hero + Сетка</span>
              <span className="text-[10px] text-fg-muted">Часы, поиск и модульные виджеты</span>
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
              <span className="text-xs font-bold text-fg mb-1">Свободный холст</span>
              <span className="text-[10px] text-fg-muted">100% экран под виджеты без Hero</span>
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
              <span className="text-xs font-bold text-fg mb-1">Режим Zen</span>
              <span className="text-[10px] text-fg-muted">Минимализм и чистый фокус</span>
            </button>
          </div>
        </div>

        {/* Секция 2: Настройки Hero-зоны */}
        {layoutMode !== 'canvas' && (
          <div className="p-4 rounded-xl bg-surface border border-line space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Sparkles className="w-4 h-4" />
              <span>Элементы Hero-зоны</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">Показывать большие часы</span>
                <Switch
                  checked={heroSettings?.showClock !== false}
                  onChange={(val) => updateHeroSettings({ showClock: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">Показывать приветствие</span>
                <Switch
                  checked={heroSettings?.showGreeting !== false}
                  onChange={(val) => updateHeroSettings({ showGreeting: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">Показывать строку поиска</span>
                <Switch
                  checked={heroSettings?.showSearchBar !== false}
                  onChange={(val) => updateHeroSettings({ showSearchBar: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">Показывать прогресс года</span>
                <Switch
                  checked={heroSettings?.showYearProgress !== false}
                  onChange={(val) => updateHeroSettings({ showYearProgress: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-fg">Показывать быстрые ссылки (SpeedDial)</span>
                <Switch
                  checked={heroSettings?.showSpeedDial !== false}
                  onChange={(val) => updateHeroSettings({ showSpeedDial: val })}
                />
              </div>

              {/* Выравнивание Hero */}
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <span className="text-xs font-medium text-fg">Выравнивание контента</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={heroSettings?.alignment === 'left' ? 'primary' : 'secondary'}
                    onClick={() => updateHeroSettings({ alignment: 'left' })}
                  >
                    По левому краю
                  </Button>
                  <Button
                    size="sm"
                    variant={(heroSettings?.alignment || 'center') === 'center' ? 'primary' : 'secondary'}
                    onClick={() => updateHeroSettings({ alignment: 'center' })}
                  >
                    По центру
                  </Button>
                </div>
              </div>

              {/* Стиль часов */}
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <span className="text-xs font-medium text-fg">Стиль часов Hero</span>
                <select
                  value={heroSettings?.clockStyle || 'digital'}
                  onChange={(e) => updateHeroSettings({ clockStyle: e.target.value as any })}
                  className="bg-surface text-xs text-fg border border-line rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:border-primary cursor-pointer"
                >
                  <option value="digital">Digital (Современный)</option>
                  <option value="minimal">Minimal (Тонкий)</option>
                  <option value="serif">Serif (Элегантный)</option>
                  <option value="mono">Mono (Код)</option>
                  <option value="flip">Flip (Перекидной)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Секция 3: Сетка и Расположение */}
        <div className="p-4 rounded-xl bg-surface border border-line space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
            <SlidersHorizontal className="w-4 h-4" />
            <span>{getTranslation(language, 'settings.layout')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">Количество колонок</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={columns === 12 ? 'primary' : 'secondary'}
                onClick={() => setColumns(12)}
              >
                12 Колонок
              </Button>
              <Button
                size="sm"
                variant={columns === 16 ? 'primary' : 'secondary'}
                onClick={() => setColumns(16)}
              >
                16 Колонок
              </Button>
              <Button
                size="sm"
                variant={columns === 24 ? 'primary' : 'secondary'}
                onClick={() => setColumns(24)}
              >
                24 Колонки
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <Slider
              label="Межэлементный зазор (Gap)"
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
            <span>{getTranslation(language, 'settings.general')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">{getTranslation(language, 'settings.language')}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={language === 'ru' ? 'primary' : 'secondary'}
                onClick={() => setLanguage('ru')}
              >
                Русский
              </Button>
              <Button
                size="sm"
                variant={language === 'en' ? 'primary' : 'secondary'}
                onClick={() => setLanguage('en')}
              >
                English
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-fg">{getTranslation(language, 'settings.animations')}</span>
            <Switch checked={animationsEnabled} onChange={setAnimationsEnabled} />
          </div>
        </div>

        {/* Секция 5: Импорт и Экспорт */}
        <div className="p-4 rounded-xl bg-surface border border-line flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-fg">Импорт / Экспорт данных</p>
            <p className="text-[10px] text-fg-muted">Сохранение и восстановление настроек в JSON</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setIsImportOpen(true)}>
            Управление JSON
          </Button>
        </div>

        <ImportExportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      </div>
    </Modal>
  );
};
