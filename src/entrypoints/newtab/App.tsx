import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslation } from '@/core/i18n';
import { GridEngine } from '@/features/dashboard/components/GridEngine';
import { NavRail } from '@/features/navigation/NavRail';
import { CommandPalette } from '@/features/dashboard/components/CommandPalette';
import { SettingsModal } from '@/features/settings/components/SettingsModal';
import { AddWidgetModal } from '@/features/dashboard/components/AddWidgetModal';
import { MarketplaceModal } from '@/features/marketplace/components/MarketplaceModal';
import { AppearanceModal } from '@/features/appearance';
import { useThemeStore } from '@/core/theme/themeStore';
import { Spinner } from '@/ui/feedback';

export default function App() {
  const { isInitialized, initialize: initApp } = useAppStore();
  const { activeModal, setActiveModal, initializeDashboard } = useDashboardStore();
  const initializeTheme = useThemeStore((state) => state.initialize);
  const { t } = useTranslation();

  useEffect(() => {
    initApp();
    initializeDashboard();
    initializeTheme();
  }, [initApp, initializeDashboard, initializeTheme]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-fg">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm font-medium tracking-wide text-fg-muted">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-fg transition-colors duration-normal relative sm:pl-16 pb-20 sm:pb-6">
      {/* Навигационный рельс (Desktop: слева, Mobile: снизу) */}
      <NavRail />

      {/* Основная рабочая область дашборда */}
      <main className="flex-1 w-full px-3 sm:px-6 py-4 sm:py-6">
        <GridEngine />
      </main>

      {/* Модальные окна и оверлеи */}
      <CommandPalette />
      <SettingsModal />
      <AddWidgetModal />
      <MarketplaceModal />
      <AppearanceModal isOpen={activeModal === 'themes'} onClose={() => setActiveModal(null)} />
    </div>
  );
}
