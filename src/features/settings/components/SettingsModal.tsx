import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAppStore } from '@/stores/useAppStore';
import { getTranslation } from '@/services/localization/i18n';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { ImportExportModal } from './ImportExportModal';
import { Settings, Globe, Layout, Palette, Sparkles } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { activeModal, setActiveModal, columns, setColumns, gap, setGap } = useDashboardStore();
  const { language, setLanguage, theme, setTheme, animationsEnabled, setAnimationsEnabled } = useAppStore();
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
        {/* Секция: Основные настройки */}
        <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--color-secondary)]">
            <Globe className="w-4 h-4" />
            <span>{getTranslation(language, 'settings.general')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{getTranslation(language, 'settings.language')}</span>
            <div className="flex space-x-2">
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
            <span className="text-xs font-medium">{getTranslation(language, 'settings.animations')}</span>
            <Switch checked={animationsEnabled} onChange={setAnimationsEnabled} />
          </div>
        </div>

        {/* Секция: Сетка и Расположение */}
        <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--color-secondary)]">
            <Layout className="w-4 h-4" />
            <span>{getTranslation(language, 'settings.layout')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Количество колонок</span>
            <div className="flex space-x-2">
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

        {/* Секция: Импорт и Экспорт */}
        <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[var(--color-text)]">Импорт / Экспорт данных</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">Сохранение и восстановление настроек в JSON</p>
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
